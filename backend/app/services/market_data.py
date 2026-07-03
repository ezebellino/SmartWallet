import base64
import hashlib
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

import httpx
from cryptography.fernet import Fernet
from sqlalchemy import select

from app.core.config import settings
from app.models.investment import InvestmentAsset, InvestmentAssetType
from app.models.market_integration import MarketIntegrationSetting
from app.repositories.investments import InvestmentRepository
from app.schemas.market_data import (
    MarketDataIntegration,
    MarketDataIntegrationsResponse,
    MarketDataIntegrationUpdate,
    MarketDataRefreshResponse,
    MarketQuoteResult,
)


CRYPTO_IDS_BY_SYMBOL = {
    "ADA": "cardano",
    "BNB": "binancecoin",
    "BTC": "bitcoin",
    "DOGE": "dogecoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "USDC": "usd-coin",
    "USDT": "tether",
    "XRP": "ripple",
}

PROVIDER_DEFAULTS = {
    "coingecko": {"enabled": True, "auth_required": False},
    "dolarapi": {"enabled": True, "auth_required": False},
    "manual": {"enabled": True, "auth_required": False},
    "alphavantage": {"enabled": False, "auth_required": True},
}

ALPHA_VANTAGE_ASSET_TYPES = {
    InvestmentAssetType.cedear,
    InvestmentAssetType.etf,
    InvestmentAssetType.index,
    InvestmentAssetType.stock,
}
ALPHA_VANTAGE_FREE_REQUESTS_PER_REFRESH = 1


@dataclass(frozen=True)
class ProviderQuote:
    provider: str
    price: Decimal
    currency: str
    fetched_at: datetime


class ExternalMarketDataProvider:
    def __init__(self, timeout_seconds: float = 8.0) -> None:
        self.timeout_seconds = timeout_seconds

    def fetch_crypto_price(self, symbol: str, currency: str) -> ProviderQuote:
        normalized_symbol = symbol.upper().strip()
        coin_id = CRYPTO_IDS_BY_SYMBOL.get(normalized_symbol)
        if not coin_id:
            raise ValueError(f"No CoinGecko mapping configured for {normalized_symbol}")

        normalized_currency = currency.lower().strip()
        response = httpx.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": coin_id, "vs_currencies": normalized_currency},
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        data: dict[str, Any] = response.json()
        price = data.get(coin_id, {}).get(normalized_currency)
        if price is None:
            raise ValueError(f"CoinGecko did not return {normalized_symbol}/{currency}")

        return ProviderQuote(
            provider="coingecko",
            price=Decimal(str(price)),
            currency=currency.upper(),
            fetched_at=datetime.now(timezone.utc),
        )

    def fetch_usd_ars_rate(self) -> ProviderQuote:
        response = httpx.get("https://dolarapi.com/v1/dolares/blue", timeout=self.timeout_seconds)
        response.raise_for_status()
        data: dict[str, Any] = response.json()
        price = data.get("venta")
        if price is None:
            raise ValueError("DolarAPI did not return a sell price")

        fetched_at = data.get("fechaActualizacion")
        return ProviderQuote(
            provider="dolarapi",
            price=Decimal(str(price)),
            currency="ARS",
            fetched_at=datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
            if isinstance(fetched_at, str)
            else datetime.now(timezone.utc),
        )

    def fetch_stock_price(self, symbol: str, currency: str, api_key: str) -> ProviderQuote:
        normalized_symbol = symbol.upper().strip()
        response = httpx.get(
            "https://www.alphavantage.co/query",
            params={
                "function": "GLOBAL_QUOTE",
                "symbol": normalized_symbol,
                "apikey": api_key,
            },
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        data: dict[str, Any] = response.json()

        if "Note" in data:
            raise ValueError("Alpha Vantage rate limit reached. Try again later.")
        if "Information" in data:
            raise ValueError(str(data["Information"]))
        if "Error Message" in data:
            raise ValueError(str(data["Error Message"]))

        quote = data.get("Global Quote")
        price = quote.get("05. price") if isinstance(quote, dict) else None
        if price is None:
            raise ValueError(f"Alpha Vantage did not return a price for {normalized_symbol}")

        return ProviderQuote(
            provider="alphavantage",
            price=Decimal(str(price)),
            currency=currency.upper(),
            fetched_at=datetime.now(timezone.utc),
        )


class MarketDataService:
    def __init__(
        self,
        investments: InvestmentRepository,
        provider: ExternalMarketDataProvider | None = None,
    ) -> None:
        self.investments = investments
        self.provider = provider or ExternalMarketDataProvider()

    def refresh_investment_prices(self, user_id: int) -> MarketDataRefreshResponse:
        results: list[MarketQuoteResult] = []
        provider_requests = {"alphavantage": 0}

        for asset in self.investments.list_assets(user_id):
            quote = self._refresh_asset(asset, provider_requests)
            results.append(quote)

        return MarketDataRefreshResponse(
            updated_count=sum(1 for quote in results if quote.status == "updated"),
            skipped_count=sum(1 for quote in results if quote.status == "skipped"),
            failed_count=sum(1 for quote in results if quote.status == "failed"),
            quotes=results,
        )

    def list_integrations(self, user_id: int) -> MarketDataIntegrationsResponse:
        assets = self.investments.list_assets(user_id)
        settings_by_key = self._list_settings(user_id)
        crypto_symbols = sorted(
            {
                asset.symbol.upper().strip()
                for asset in assets
                if asset.asset_type == InvestmentAssetType.crypto and asset.symbol.upper().strip() in CRYPTO_IDS_BY_SYMBOL
            }
        )
        usd_ars_assets = [
            asset
            for asset in assets
            if asset.symbol.upper().strip() == "USD" and asset.currency.upper().strip() == "ARS"
        ]
        alpha_vantage_assets = [asset for asset in assets if asset.asset_type in ALPHA_VANTAGE_ASSET_TYPES]

        integrations = [
            self._build_integration(
                key="coingecko",
                name="CoinGecko",
                coverage="Crypto market prices",
                supported_asset_types=["crypto"],
                supported_symbols=sorted(CRYPTO_IDS_BY_SYMBOL.keys()),
                configured_assets_count=len(crypto_symbols),
                last_refresh_at=self._latest_refresh_at(asset for asset in assets if asset.price_source == "coingecko"),
                setting=settings_by_key.get("coingecko"),
            ),
            self._build_integration(
                key="dolarapi",
                name="DolarAPI",
                coverage="USD/ARS reference rate",
                supported_asset_types=["currency"],
                supported_symbols=["USD/ARS"],
                configured_assets_count=len(usd_ars_assets),
                last_refresh_at=self._latest_refresh_at(asset for asset in assets if asset.price_source == "dolarapi"),
                setting=settings_by_key.get("dolarapi"),
            ),
            self._build_integration(
                key="alphavantage",
                name="Alpha Vantage",
                coverage="Stocks, ETFs, and indexes",
                supported_asset_types=["stock", "etf", "index", "cedear"],
                supported_symbols=[],
                configured_assets_count=len(alpha_vantage_assets),
                last_refresh_at=self._latest_refresh_at(asset for asset in assets if asset.price_source == "alphavantage"),
                setting=settings_by_key.get("alphavantage"),
            ),
            self._build_integration(
                key="manual",
                name="Manual prices",
                coverage="Fallback prices entered by the user",
                supported_asset_types=[
                    "stock",
                    "bond",
                    "cedear",
                    "mutual_fund",
                    "index",
                    "etf",
                    "fixed_term",
                    "other",
                ],
                supported_symbols=[],
                configured_assets_count=sum(1 for asset in assets if asset.price_source in (None, "manual")),
                last_refresh_at=self._latest_refresh_at(asset for asset in assets if asset.price_source == "manual"),
                setting=settings_by_key.get("manual"),
            ),
        ]
        return MarketDataIntegrationsResponse(integrations=integrations)

    def update_integration(
        self,
        user_id: int,
        provider_key: str,
        data: MarketDataIntegrationUpdate,
    ) -> MarketDataIntegration:
        normalized_key = provider_key.lower().strip()
        if normalized_key not in PROVIDER_DEFAULTS:
            raise ValueError("Unknown market data provider")

        setting = self._get_or_create_setting(user_id, normalized_key)
        if data.enabled is not None:
            setting.enabled = data.enabled

        if data.clear_api_key:
            setting.api_key_encrypted = None
            setting.api_key_last4 = None
        elif data.api_key is not None and data.api_key.strip():
            api_key = data.api_key.strip()
            setting.api_key_encrypted = self._encrypt_api_key(api_key)
            setting.api_key_last4 = api_key[-4:]

        self.investments.db.commit()
        return next(
            integration
            for integration in self.list_integrations(user_id).integrations
            if integration.key == normalized_key
        )

    def _refresh_asset(self, asset: InvestmentAsset, provider_requests: dict[str, int]) -> MarketQuoteResult:
        try:
            quote = self._fetch_quote(asset, provider_requests)
            if quote is None:
                return MarketQuoteResult(
                    asset_id=asset.id,
                    symbol=asset.symbol,
                    provider=None,
                    price=None,
                    currency=asset.currency,
                    fetched_at=None,
                    status="skipped",
                    message=self._skipped_message(asset, provider_requests),
                )

            self.investments.update_asset_market_price(
                asset=asset,
                price=quote.price,
                provider=quote.provider,
                currency=quote.currency,
                fetched_at=quote.fetched_at,
            )
            return MarketQuoteResult(
                asset_id=asset.id,
                symbol=asset.symbol,
                provider=quote.provider,
                price=quote.price,
                currency=quote.currency,
                fetched_at=quote.fetched_at,
                status="updated",
                message="Price updated",
            )
        except Exception as exc:
            return MarketQuoteResult(
                asset_id=asset.id,
                symbol=asset.symbol,
                provider=None,
                price=None,
                currency=asset.currency,
                fetched_at=None,
                status="failed",
                message=str(exc),
            )

    def _fetch_quote(self, asset: InvestmentAsset, provider_requests: dict[str, int]) -> ProviderQuote | None:
        symbol = asset.symbol.upper().strip()
        currency = asset.currency.upper().strip()

        if asset.asset_type == InvestmentAssetType.crypto:
            if not self._is_provider_enabled(asset.user_id, "coingecko"):
                return None
            return self.provider.fetch_crypto_price(symbol, currency)

        if symbol == "USD" and currency == "ARS":
            if not self._is_provider_enabled(asset.user_id, "dolarapi"):
                return None
            return self.provider.fetch_usd_ars_rate()

        if asset.asset_type in ALPHA_VANTAGE_ASSET_TYPES:
            if not self._is_provider_enabled(asset.user_id, "alphavantage"):
                return None
            if provider_requests["alphavantage"] >= ALPHA_VANTAGE_FREE_REQUESTS_PER_REFRESH:
                return None
            api_key = self._get_provider_api_key(asset.user_id, "alphavantage")
            if not api_key:
                raise ValueError("Alpha Vantage API key is required")
            provider_requests["alphavantage"] += 1
            return self.provider.fetch_stock_price(symbol, currency, api_key)

        return None

    def _skipped_message(self, asset: InvestmentAsset, provider_requests: dict[str, int]) -> str:
        if (
            asset.asset_type in ALPHA_VANTAGE_ASSET_TYPES
            and self._is_provider_enabled(asset.user_id, "alphavantage")
            and provider_requests["alphavantage"] >= ALPHA_VANTAGE_FREE_REQUESTS_PER_REFRESH
        ):
            return "Alpha Vantage free plan allows one stock price per refresh"

        return "No market data provider configured for this asset"

    def _latest_refresh_at(self, assets: Iterable[InvestmentAsset]) -> datetime | None:
        dates = [asset.price_updated_at for asset in assets if asset.price_updated_at is not None]
        return max(dates) if dates else None

    def _build_integration(
        self,
        *,
        key: str,
        name: str,
        coverage: str,
        supported_asset_types: list[str],
        supported_symbols: list[str],
        configured_assets_count: int,
        last_refresh_at: datetime | None,
        setting: MarketIntegrationSetting | None,
    ) -> MarketDataIntegration:
        defaults = PROVIDER_DEFAULTS[key]
        enabled = setting.enabled if setting else bool(defaults["enabled"])
        has_api_key = bool(setting and setting.api_key_encrypted)
        auth_required = bool(defaults["auth_required"])
        status = self._integration_status(enabled=enabled, auth_required=auth_required, has_api_key=has_api_key)

        return MarketDataIntegration(
            key=key,
            name=name,
            status=status,
            enabled=enabled,
            auth_required=auth_required,
            has_api_key=has_api_key,
            api_key_last4=setting.api_key_last4 if setting else None,
            coverage=coverage,
            supported_asset_types=supported_asset_types,
            supported_symbols=supported_symbols,
            configured_assets_count=configured_assets_count,
            last_refresh_at=last_refresh_at,
        )

    def _integration_status(self, *, enabled: bool, auth_required: bool, has_api_key: bool) -> str:
        if not enabled:
            return "disabled"
        if auth_required and not has_api_key:
            return "needs_key"
        return "active"

    def _list_settings(self, user_id: int) -> dict[str, MarketIntegrationSetting]:
        statement = select(MarketIntegrationSetting).where(MarketIntegrationSetting.user_id == user_id)
        return {setting.provider_key: setting for setting in self.investments.db.scalars(statement).all()}

    def _get_or_create_setting(self, user_id: int, provider_key: str) -> MarketIntegrationSetting:
        statement = select(MarketIntegrationSetting).where(
            MarketIntegrationSetting.user_id == user_id,
            MarketIntegrationSetting.provider_key == provider_key,
        )
        setting = self.investments.db.scalar(statement)
        if setting:
            return setting

        setting = MarketIntegrationSetting(
            user_id=user_id,
            provider_key=provider_key,
            enabled=bool(PROVIDER_DEFAULTS[provider_key]["enabled"]),
        )
        self.investments.db.add(setting)
        self.investments.db.flush()
        return setting

    def _is_provider_enabled(self, user_id: int, provider_key: str) -> bool:
        setting = self._list_settings(user_id).get(provider_key)
        return setting.enabled if setting else bool(PROVIDER_DEFAULTS[provider_key]["enabled"])

    def _encrypt_api_key(self, api_key: str) -> str:
        digest = hashlib.sha256(settings.jwt_secret_key.encode("utf-8")).digest()
        key = base64.urlsafe_b64encode(digest)
        return Fernet(key).encrypt(api_key.encode("utf-8")).decode("utf-8")

    def _decrypt_api_key(self, encrypted_api_key: str) -> str:
        digest = hashlib.sha256(settings.jwt_secret_key.encode("utf-8")).digest()
        key = base64.urlsafe_b64encode(digest)
        return Fernet(key).decrypt(encrypted_api_key.encode("utf-8")).decode("utf-8")

    def _get_provider_api_key(self, user_id: int, provider_key: str) -> str | None:
        setting = self._list_settings(user_id).get(provider_key)
        if not setting or not setting.api_key_encrypted:
            return None
        return self._decrypt_api_key(setting.api_key_encrypted)
