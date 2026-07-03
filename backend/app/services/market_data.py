from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

import httpx

from app.models.investment import InvestmentAsset, InvestmentAssetType
from app.repositories.investments import InvestmentRepository
from app.schemas.investment import InvestmentAssetUpdate
from app.schemas.market_data import MarketDataRefreshResponse, MarketQuoteResult


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

        for asset in self.investments.list_assets(user_id):
            quote = self._refresh_asset(asset)
            results.append(quote)

        return MarketDataRefreshResponse(
            updated_count=sum(1 for quote in results if quote.status == "updated"),
            skipped_count=sum(1 for quote in results if quote.status == "skipped"),
            failed_count=sum(1 for quote in results if quote.status == "failed"),
            quotes=results,
        )

    def _refresh_asset(self, asset: InvestmentAsset) -> MarketQuoteResult:
        try:
            quote = self._fetch_quote(asset)
            if quote is None:
                return MarketQuoteResult(
                    asset_id=asset.id,
                    symbol=asset.symbol,
                    provider=None,
                    price=None,
                    currency=asset.currency,
                    fetched_at=None,
                    status="skipped",
                    message="No market data provider configured for this asset",
                )

            self.investments.update_asset(asset, InvestmentAssetUpdate(current_price=quote.price))
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

    def _fetch_quote(self, asset: InvestmentAsset) -> ProviderQuote | None:
        symbol = asset.symbol.upper().strip()
        currency = asset.currency.upper().strip()

        if asset.asset_type == InvestmentAssetType.crypto:
            return self.provider.fetch_crypto_price(symbol, currency)

        if symbol == "USD" and currency == "ARS":
            return self.provider.fetch_usd_ars_rate()

        return None

