from decimal import Decimal

from fastapi.testclient import TestClient

from app.services.market_data import ProviderQuote


def test_market_data_refresh_updates_crypto_asset(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch,
) -> None:
    asset_response = client.post(
        "/investments/assets",
        headers=auth_headers,
        json={
            "name": "Bitcoin",
            "symbol": "BTC",
            "asset_type": "crypto",
            "currency": "USD",
            "risk_level": "high",
            "current_price": "50000.0000",
        },
    )
    asset = asset_response.json()

    def fake_fetch_crypto_price(self, symbol: str, currency: str) -> ProviderQuote:
        assert symbol == "BTC"
        assert currency == "USD"
        from datetime import datetime, timezone

        return ProviderQuote(
            provider="coingecko",
            price=Decimal("65000.1234"),
            currency="USD",
            fetched_at=datetime(2026, 7, 3, tzinfo=timezone.utc),
        )

    monkeypatch.setattr(
        "app.services.market_data.ExternalMarketDataProvider.fetch_crypto_price",
        fake_fetch_crypto_price,
    )

    refresh_response = client.post("/market-data/refresh-prices", headers=auth_headers)

    assert refresh_response.status_code == 200
    body = refresh_response.json()
    assert body["updated_count"] == 1
    assert body["failed_count"] == 0
    assert body["quotes"][0]["asset_id"] == asset["id"]
    assert body["quotes"][0]["provider"] == "coingecko"
    assert body["quotes"][0]["price"] == "65000.1234"

    assets_response = client.get("/investments/assets", headers=auth_headers)
    updated_asset = assets_response.json()[0]
    assert updated_asset["current_price"] == "65000.1234"
    assert updated_asset["price_source"] == "coingecko"
    assert updated_asset["price_updated_at"].startswith("2026-07-03T00:00:00")

    history_response = client.get(
        f"/investments/assets/{asset['id']}/price-history",
        headers=auth_headers,
    )

    assert history_response.status_code == 200
    history = history_response.json()
    assert len(history) == 1
    assert history[0]["asset_id"] == asset["id"]
    assert history[0]["provider"] == "coingecko"
    assert history[0]["price"] == "65000.1234"


def test_market_data_refresh_skips_unsupported_assets(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    client.post(
        "/investments/assets",
        headers=auth_headers,
        json={
            "name": "Apple",
            "symbol": "AAPL",
            "asset_type": "stock",
            "currency": "USD",
            "risk_level": "medium",
            "current_price": "200.0000",
        },
    )

    refresh_response = client.post("/market-data/refresh-prices", headers=auth_headers)

    assert refresh_response.status_code == 200
    body = refresh_response.json()
    assert body["updated_count"] == 0
    assert body["skipped_count"] == 1
    assert body["quotes"][0]["status"] == "skipped"


def test_market_data_routes_require_auth(client: TestClient) -> None:
    response = client.post("/market-data/refresh-prices")

    assert response.status_code == 401
