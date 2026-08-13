import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.market_integration import MarketIntegrationSetting
from app.repositories.binance import BinanceRepository
from app.schemas.binance import (
    BinanceAccountRead,
    BinanceBalance,
    BinanceBalanceSnapshotRead,
    BinanceIntegrationRead,
    BinanceIntegrationUpdate,
    BinancePortfolioAlert,
    BinancePortfolioHolding,
    BinancePortfolioSummary,
    BinanceSyncResponse,
)


BINANCE_PROVIDER_KEY = "binance"
BINANCE_BASE_URL = "https://api.binance.com"


@dataclass(frozen=True)
class BinanceCredentials:
    api_key: str
    api_secret: str


class BinanceClient:
    def __init__(self, *, base_url: str = BINANCE_BASE_URL, timeout_seconds: float = 8.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def account_info(self, credentials: BinanceCredentials) -> dict[str, Any]:
        return self._signed_get(
            "/api/v3/account",
            credentials,
            {"omitZeroBalances": "true", "recvWindow": "5000"},
        )

    def ticker_price(self, symbol: str) -> Decimal:
        response = httpx.get(
            f"{self.base_url}/api/v3/ticker/price",
            params={"symbol": symbol},
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict) or data.get("price") is None:
            raise ValueError(f"Binance did not return a price for {symbol}")
        return Decimal(str(data["price"]))

    def _signed_get(
        self,
        path: str,
        credentials: BinanceCredentials,
        params: dict[str, str],
    ) -> dict[str, Any]:
        signed_params = {**params, "timestamp": str(int(time.time() * 1000))}
        query_string = urlencode(signed_params)
        signature = hmac.new(
            credentials.api_secret.encode("utf-8"),
            query_string.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        response = httpx.get(
            f"{self.base_url}{path}?{query_string}&signature={signature}",
            headers={"X-MBX-APIKEY": credentials.api_key},
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError("Binance returned an unexpected account response")
        return data


class BinanceService:
    def __init__(
        self,
        db: Session,
        repository: BinanceRepository,
        client: BinanceClient | None = None,
    ) -> None:
        self.db = db
        self.repository = repository
        self.client = client or BinanceClient()

    def get_integration(self, user_id: int) -> BinanceIntegrationRead:
        setting = self._get_setting(user_id)
        enabled = setting.enabled if setting else False
        has_api_key = bool(setting and setting.api_key_encrypted)
        return BinanceIntegrationRead(
            enabled=enabled,
            status=self._status(enabled=enabled, has_api_key=has_api_key),
            has_api_key=has_api_key,
            api_key_last4=setting.api_key_last4 if setting else None,
            last_sync_at=self.repository.latest_sync_at(user_id),
        )

    def update_integration(self, user_id: int, data: BinanceIntegrationUpdate) -> BinanceIntegrationRead:
        setting = self._get_or_create_setting(user_id)
        if data.enabled is not None:
            setting.enabled = data.enabled

        if data.clear_credentials:
            setting.api_key_encrypted = None
            setting.api_key_last4 = None
        elif data.api_key is not None or data.api_secret is not None:
            if not data.api_key or not data.api_secret:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Binance API key and secret are required together",
                )
            api_key = data.api_key.strip()
            api_secret = data.api_secret.strip()
            setting.api_key_encrypted = self._encrypt_credentials(
                BinanceCredentials(api_key=api_key, api_secret=api_secret)
            )
            setting.api_key_last4 = api_key[-4:]

        self.db.commit()
        return self.get_integration(user_id)

    def get_account(self, user_id: int) -> BinanceAccountRead:
        setting = self._require_active_setting(user_id)
        credentials = self._decrypt_credentials(setting.api_key_encrypted or "")
        try:
            account = self.client.account_info(credentials)
        except httpx.HTTPStatusError as exc:
            detail = self._binance_error_detail(exc)
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

        fetched_at = datetime.now(timezone.utc)
        balances = self._parse_balances(account)
        return BinanceAccountRead(
            account_type=account.get("accountType") if isinstance(account.get("accountType"), str) else None,
            can_trade=account.get("canTrade") if isinstance(account.get("canTrade"), bool) else None,
            can_deposit=account.get("canDeposit") if isinstance(account.get("canDeposit"), bool) else None,
            can_withdraw=account.get("canWithdraw") if isinstance(account.get("canWithdraw"), bool) else None,
            permissions=account.get("permissions") if isinstance(account.get("permissions"), list) else [],
            balances=balances,
            fetched_at=fetched_at,
        )

    def sync_balances(self, user_id: int) -> BinanceSyncResponse:
        account = self.get_account(user_id)
        snapshots = self.repository.create_balance_snapshots(
            user_id=user_id,
            balances=[
                (balance.asset, balance.free, balance.locked, balance.total)
                for balance in account.balances
                if balance.total > 0
            ],
            fetched_at=account.fetched_at,
        )
        return BinanceSyncResponse(
            synced_count=len(snapshots),
            balances=[BinanceBalanceSnapshotRead.model_validate(snapshot, from_attributes=True) for snapshot in snapshots],
        )

    def list_snapshots(self, *, user_id: int, limit: int) -> list[BinanceBalanceSnapshotRead]:
        snapshots = self.repository.list_balance_snapshots(user_id=user_id, limit=limit)
        return [BinanceBalanceSnapshotRead.model_validate(snapshot, from_attributes=True) for snapshot in snapshots]

    def get_portfolio_summary(self, user_id: int) -> BinancePortfolioSummary:
        snapshots = self.repository.list_latest_balance_snapshots(user_id)
        latest_sync_at = self.repository.latest_sync_at(user_id)
        holdings: list[BinancePortfolioHolding] = []

        for snapshot in snapshots:
            price = self._price_asset_usd(snapshot.asset)
            estimated_value = snapshot.total * price if price is not None else None
            holdings.append(
                BinancePortfolioHolding(
                    asset=snapshot.asset,
                    free=snapshot.free,
                    locked=snapshot.locked,
                    total=snapshot.total,
                    price_usd=price,
                    estimated_value_usd=estimated_value,
                    allocation_percentage=None,
                    price_source="binance_public" if price is not None else None,
                )
            )

        total_value = sum(
            holding.estimated_value_usd for holding in holdings if holding.estimated_value_usd is not None
        )
        enriched_holdings = [
            holding.model_copy(
                update={
                    "allocation_percentage": float((holding.estimated_value_usd / total_value) * 100)
                    if total_value > 0 and holding.estimated_value_usd is not None
                    else None
                }
            )
            for holding in holdings
        ]
        enriched_holdings.sort(
            key=lambda holding: holding.estimated_value_usd if holding.estimated_value_usd is not None else Decimal("-1"),
            reverse=True,
        )

        return BinancePortfolioSummary(
            total_estimated_value_usd=total_value,
            asset_count=len(enriched_holdings),
            priced_asset_count=sum(1 for holding in enriched_holdings if holding.estimated_value_usd is not None),
            unpriced_asset_count=sum(1 for holding in enriched_holdings if holding.estimated_value_usd is None),
            latest_sync_at=latest_sync_at,
            holdings=enriched_holdings,
            alerts=self._build_portfolio_alerts(enriched_holdings, latest_sync_at),
        )

    def _parse_balances(self, account: dict[str, Any]) -> list[BinanceBalance]:
        balances: list[BinanceBalance] = []
        for item in account.get("balances", []):
            if not isinstance(item, dict):
                continue
            asset = str(item.get("asset", "")).upper().strip()
            free = Decimal(str(item.get("free", "0")))
            locked = Decimal(str(item.get("locked", "0")))
            total = free + locked
            if asset and total > 0:
                balances.append(BinanceBalance(asset=asset, free=free, locked=locked, total=total))
        return sorted(balances, key=lambda balance: balance.total, reverse=True)

    def _price_asset_usd(self, asset: str) -> Decimal | None:
        normalized_asset = self._normalize_pricing_asset(asset)
        if normalized_asset in {"USDT", "USDC", "FDUSD", "BUSD", "DAI", "TUSD", "USD"}:
            return Decimal("1")
        if normalized_asset == "WBETH":
            normalized_asset = "ETH"
        try:
            return self.client.ticker_price(f"{normalized_asset}USDT")
        except Exception:
            return None

    def _normalize_pricing_asset(self, asset: str) -> str:
        normalized_asset = asset.upper().strip()
        if normalized_asset.startswith("LD") and len(normalized_asset) > 2:
            normalized_asset = normalized_asset[2:]
        if normalized_asset == "SHIB2":
            return "SHIB"
        return normalized_asset

    def _build_portfolio_alerts(
        self,
        holdings: list[BinancePortfolioHolding],
        latest_sync_at: datetime | None,
    ) -> list[BinancePortfolioAlert]:
        alerts: list[BinancePortfolioAlert] = []
        if latest_sync_at is None:
            return alerts

        now = datetime.now(timezone.utc)
        normalized_latest_sync_at = latest_sync_at if latest_sync_at.tzinfo else latest_sync_at.replace(tzinfo=timezone.utc)
        if now - normalized_latest_sync_at > timedelta(days=3):
            alerts.append(
                BinancePortfolioAlert(
                    type="stale_sync",
                    severity="medium",
                    title="Binance sin sincronizar",
                    message="La ultima sincronizacion de balances tiene mas de 3 dias.",
                )
            )

        priced_holdings = [holding for holding in holdings if holding.allocation_percentage is not None]
        largest_holding = priced_holdings[0] if priced_holdings else None
        if largest_holding and (largest_holding.allocation_percentage or 0) >= 50:
            alerts.append(
                BinancePortfolioAlert(
                    type="high_concentration",
                    severity="high",
                    title=f"Alta concentracion en {largest_holding.asset}",
                    message="Un solo activo representa mas del 50% de la wallet Binance valorizada.",
                    asset=largest_holding.asset,
                    value=largest_holding.estimated_value_usd,
                    percentage=largest_holding.allocation_percentage,
                )
            )

        core_allocation = sum(
            holding.allocation_percentage or 0 for holding in holdings if holding.asset in {"BTC", "ETH", "WBETH"}
        )
        if priced_holdings and core_allocation < 20:
            alerts.append(
                BinancePortfolioAlert(
                    type="low_btc_eth_exposure",
                    severity="medium",
                    title="Baja exposicion BTC/ETH",
                    message="BTC y ETH representan menos del 20% de la wallet Binance valorizada.",
                    percentage=core_allocation,
                )
            )

        unpriced_count = sum(1 for holding in holdings if holding.estimated_value_usd is None)
        if unpriced_count > 0:
            alerts.append(
                BinancePortfolioAlert(
                    type="unpriced_assets",
                    severity="low",
                    title="Activos sin precio",
                    message=f"{unpriced_count} activos no pudieron valorizarse contra USDT.",
                )
            )

        return alerts

    def _require_active_setting(self, user_id: int) -> MarketIntegrationSetting:
        setting = self._get_setting(user_id)
        if not setting or not setting.enabled:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Binance integration is disabled")
        if not setting.api_key_encrypted:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Binance API key and secret are required")
        return setting

    def _get_setting(self, user_id: int) -> MarketIntegrationSetting | None:
        statement = select(MarketIntegrationSetting).where(
            MarketIntegrationSetting.user_id == user_id,
            MarketIntegrationSetting.provider_key == BINANCE_PROVIDER_KEY,
        )
        return self.db.scalar(statement)

    def _get_or_create_setting(self, user_id: int) -> MarketIntegrationSetting:
        setting = self._get_setting(user_id)
        if setting:
            return setting
        setting = MarketIntegrationSetting(user_id=user_id, provider_key=BINANCE_PROVIDER_KEY, enabled=False)
        self.db.add(setting)
        self.db.flush()
        return setting

    def _status(self, *, enabled: bool, has_api_key: bool) -> str:
        if not enabled:
            return "disabled"
        if not has_api_key:
            return "needs_key"
        return "active"

    def _encrypt_credentials(self, credentials: BinanceCredentials) -> str:
        payload = json.dumps({"api_key": credentials.api_key, "api_secret": credentials.api_secret})
        return self._fernet().encrypt(payload.encode("utf-8")).decode("utf-8")

    def _decrypt_credentials(self, encrypted_credentials: str) -> BinanceCredentials:
        payload = self._fernet().decrypt(encrypted_credentials.encode("utf-8")).decode("utf-8")
        data = json.loads(payload)
        return BinanceCredentials(api_key=data["api_key"], api_secret=data["api_secret"])

    def _fernet(self) -> Fernet:
        digest = hashlib.sha256(settings.jwt_secret_key.encode("utf-8")).digest()
        return Fernet(base64.urlsafe_b64encode(digest))

    def _binance_error_detail(self, exc: httpx.HTTPStatusError) -> str:
        try:
            data = exc.response.json()
        except ValueError:
            return "Binance request failed"
        message = data.get("msg") if isinstance(data, dict) else None
        code = data.get("code") if isinstance(data, dict) else None
        if message:
            return f"Binance error {code}: {message}" if code is not None else str(message)
        return "Binance request failed"
