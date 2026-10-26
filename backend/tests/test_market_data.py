from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.services.market_data import ExternalMarketDataProvider, ProviderQuote


def test_iol_cedear_quote_requires_confirmed_ars_currency(monkeypatch) -> None:
    class FakeResponse:
        def __init__(self, data: dict) -> None:
            self.data = data

        def raise_for_status(self) -> None:
            pass

        def json(self) -> dict:
            return self.data

    quote_data = {"ultimoPrecio": 12500, "moneda": "pesos_Argentinos"}
    monkeypatch.setattr("app.services.market_data.httpx.post", lambda *args, **kwargs: FakeResponse({"access_token": "fake-token"}))
    monkeypatch.setattr("app.services.market_data.httpx.get", lambda *args, **kwargs: FakeResponse(quote_data))
    provider = ExternalMarketDataProvider()

    quote = provider.fetch_iol_price("AAPL", "ARS", "user", "password", require_currency=True)
    assert quote.price == Decimal("12500")
    assert quote.currency == "ARS"

    quote_data["moneda"] = "dolares_Estadounidenses"
    with pytest.raises(ValueError, match="currency does not match"):
        provider.fetch_iol_price("AAPL", "ARS", "user", "password", require_currency=True)

    quote_data.pop("moneda")
    with pytest.raises(ValueError, match="did not confirm"):
        provider.fetch_iol_price("AAPL", "ARS", "user", "password", require_currency=True)


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


def test_market_data_refresh_updates_stock_with_alpha_vantage(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch,
) -> None:
    asset_response = client.post(
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
    asset = asset_response.json()
    client.patch(
        "/market-data/integrations/alphavantage",
        headers=auth_headers,
        json={"enabled": True, "api_key": "demo-secret-1234"},
    )

    def fake_fetch_stock_price(self, symbol: str, currency: str, api_key: str) -> ProviderQuote:
        assert symbol == "AAPL"
        assert currency == "USD"
        assert api_key == "demo-secret-1234"
        from datetime import datetime, timezone

        return ProviderQuote(
            provider="alphavantage",
            price=Decimal("220.1250"),
            currency="USD",
            fetched_at=datetime(2026, 7, 3, tzinfo=timezone.utc),
        )

    monkeypatch.setattr(
        "app.services.market_data.ExternalMarketDataProvider.fetch_stock_price",
        fake_fetch_stock_price,
    )

    refresh_response = client.post("/market-data/refresh-prices", headers=auth_headers)

    assert refresh_response.status_code == 200
    body = refresh_response.json()
    assert body["updated_count"] == 1
    assert body["failed_count"] == 0
    assert body["quotes"][0]["asset_id"] == asset["id"]
    assert body["quotes"][0]["provider"] == "alphavantage"
    assert body["quotes"][0]["price"] == "220.1250"

    assets_response = client.get("/investments/assets", headers=auth_headers)
    updated_asset = assets_response.json()[0]
    assert updated_asset["current_price"] == "220.1250"
    assert updated_asset["price_source"] == "alphavantage"


def test_market_data_refresh_reports_missing_alpha_vantage_key(
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
    client.patch(
        "/market-data/integrations/alphavantage",
        headers=auth_headers,
        json={"enabled": True, "clear_api_key": True},
    )

    refresh_response = client.post("/market-data/refresh-prices", headers=auth_headers)

    assert refresh_response.status_code == 200
    body = refresh_response.json()
    assert body["updated_count"] == 0
    assert body["failed_count"] == 1
    assert body["quotes"][0]["status"] == "failed"
    assert body["quotes"][0]["message"] == "Alpha Vantage API key is required"


def test_market_data_refresh_limits_alpha_vantage_free_plan_to_one_asset(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch,
) -> None:
    for symbol in ["AAPL", "MSFT"]:
        client.post(
            "/investments/assets",
            headers=auth_headers,
            json={
                "name": symbol,
                "symbol": symbol,
                "asset_type": "stock",
                "currency": "USD",
                "risk_level": "medium",
                "current_price": "200.0000",
            },
        )
    client.patch(
        "/market-data/integrations/alphavantage",
        headers=auth_headers,
        json={"enabled": True, "api_key": "demo-secret-1234"},
    )

    requested_symbols: list[str] = []

    def fake_fetch_stock_price(self, symbol: str, currency: str, api_key: str) -> ProviderQuote:
        requested_symbols.append(symbol)
        from datetime import datetime, timezone

        return ProviderQuote(
            provider="alphavantage",
            price=Decimal("220.1250"),
            currency="USD",
            fetched_at=datetime(2026, 7, 3, tzinfo=timezone.utc),
        )

    monkeypatch.setattr(
        "app.services.market_data.ExternalMarketDataProvider.fetch_stock_price",
        fake_fetch_stock_price,
    )

    refresh_response = client.post("/market-data/refresh-prices", headers=auth_headers)

    assert refresh_response.status_code == 200
    body = refresh_response.json()
    assert body["updated_count"] == 1
    assert body["skipped_count"] == 1
    assert body["failed_count"] == 0
    assert requested_symbols == ["AAPL"]
    assert body["quotes"][1]["status"] == "skipped"
    assert body["quotes"][1]["message"] == "Alpha Vantage free plan allows one stock price per refresh"
    assert body["refresh_plan"][0]["provider"] == "alphavantage"
    assert body["refresh_plan"][0]["updated_symbols"] == ["AAPL"]
    assert body["refresh_plan"][0]["skipped_symbols"] == ["MSFT"]
    assert body["refresh_plan"][0]["next_symbol"] == "MSFT"


def test_market_data_refresh_rotates_alpha_vantage_to_stalest_asset(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch,
) -> None:
    for symbol in ["AAPL", "MSFT"]:
        client.post(
            "/investments/assets",
            headers=auth_headers,
            json={
                "name": symbol,
                "symbol": symbol,
                "asset_type": "stock",
                "currency": "USD",
                "risk_level": "medium",
                "current_price": "200.0000",
            },
        )
    client.patch(
        "/market-data/integrations/alphavantage",
        headers=auth_headers,
        json={"enabled": True, "api_key": "demo-secret-1234"},
    )

    requested_symbols: list[str] = []

    def fake_fetch_stock_price(self, symbol: str, currency: str, api_key: str) -> ProviderQuote:
        requested_symbols.append(symbol)
        from datetime import datetime, timezone

        return ProviderQuote(
            provider="alphavantage",
            price=Decimal("220.1250"),
            currency="USD",
            fetched_at=datetime(2026, 7, 3, tzinfo=timezone.utc),
        )

    monkeypatch.setattr(
        "app.services.market_data.ExternalMarketDataProvider.fetch_stock_price",
        fake_fetch_stock_price,
    )

    first_response = client.post("/market-data/refresh-prices", headers=auth_headers)
    second_response = client.post("/market-data/refresh-prices", headers=auth_headers)

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert requested_symbols == ["AAPL", "MSFT"]
    assert second_response.json()["refresh_plan"][0]["updated_symbols"] == ["MSFT"]
    assert second_response.json()["refresh_plan"][0]["next_symbol"] == "AAPL"


def test_market_data_integrations_report_available_providers(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    client.post(
        "/investments/assets",
        headers=auth_headers,
        json={
            "name": "Ethereum",
            "symbol": "ETH",
            "asset_type": "crypto",
            "currency": "USD",
            "risk_level": "high",
            "current_price": "3000.0000",
        },
    )

    response = client.get("/market-data/integrations", headers=auth_headers)

    assert response.status_code == 200
    integrations = response.json()["integrations"]
    providers = {integration["key"]: integration for integration in integrations}
    assert providers["coingecko"]["status"] == "active"
    assert providers["coingecko"]["enabled"] is True
    assert providers["coingecko"]["auth_required"] is False
    assert providers["coingecko"]["configured_assets_count"] == 1
    assert "ETH" in providers["coingecko"]["supported_symbols"]
    assert providers["dolarapi"]["status"] == "active"
    assert providers["manual"]["status"] == "active"
    assert providers["alphavantage"]["status"] == "disabled"
    assert providers["alphavantage"]["auth_required"] is True
    assert providers["alphavantage"]["configured_assets_count"] == 0
    assert providers["iol"]["status"] == "disabled"
    assert providers["iol"]["auth_required"] is True
    assert providers["iol"]["configured_assets_count"] == 0


def test_market_data_integration_settings_can_store_api_key_metadata(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.patch(
        "/market-data/integrations/alphavantage",
        headers=auth_headers,
        json={"enabled": True, "api_key": "demo-secret-1234"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["key"] == "alphavantage"
    assert body["enabled"] is True
    assert body["status"] == "active"
    assert body["has_api_key"] is True
    assert body["api_key_last4"] == "1234"
    assert "demo-secret" not in str(body)


def test_iol_market_data_integration_can_be_configured(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    client.post(
        "/investments/assets",
        headers=auth_headers,
        json={
            "name": "YPF",
            "symbol": "YPFD",
            "asset_type": "stock",
            "currency": "ARS",
            "risk_level": "medium",
            "current_price": "1000.0000",
        },
    )

    response = client.patch(
        "/market-data/integrations/iol",
        headers=auth_headers,
        json={"enabled": True, "username": "iol_user", "password": "iol-secure-placeholder"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["key"] == "iol"
    assert body["name"] == "InvertirOnline"
    assert body["enabled"] is True
    assert body["status"] == "active"
    assert body["has_api_key"] is True
    assert body["api_key_last4"] == "user"
    assert body["configured_assets_count"] == 1
    assert "iol-secure-placeholder" not in str(body)


def test_market_data_refresh_updates_stock_with_iol(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch,
) -> None:
    asset_response = client.post(
        "/investments/assets",
        headers=auth_headers,
        json={
            "name": "YPF",
            "symbol": "YPFD",
            "asset_type": "stock",
            "currency": "ARS",
            "risk_level": "medium",
            "current_price": "1000.0000",
        },
    )
    asset = asset_response.json()
    client.patch(
        "/market-data/integrations/iol",
        headers=auth_headers,
        json={"enabled": True, "username": "iol_user", "password": "iol-password"},
    )

    def fake_fetch_iol_price(
        self,
        symbol: str,
        currency: str,
        username: str,
        password: str,
        market: str = "BCBA",
    ) -> ProviderQuote:
        assert symbol == "YPFD"
        assert currency == "ARS"
        assert username == "iol_user"
        assert password == "iol-password"
        assert market == "BCBA"
        from datetime import datetime, timezone

        return ProviderQuote(
            provider="iol",
            price=Decimal("1250.5000"),
            currency="ARS",
            fetched_at=datetime(2026, 7, 29, tzinfo=timezone.utc),
        )

    monkeypatch.setattr(
        "app.services.market_data.ExternalMarketDataProvider.fetch_iol_price",
        fake_fetch_iol_price,
    )

    refresh_response = client.post("/market-data/refresh-prices", headers=auth_headers)

    assert refresh_response.status_code == 200
    body = refresh_response.json()
    assert body["updated_count"] == 1
    assert body["failed_count"] == 0
    assert body["quotes"][0]["asset_id"] == asset["id"]
    assert body["quotes"][0]["provider"] == "iol"
    assert body["quotes"][0]["price"] == "1250.5000"

    assets_response = client.get("/investments/assets", headers=auth_headers)
    updated_asset = assets_response.json()[0]
    assert updated_asset["current_price"] == "1250.5000"
    assert updated_asset["price_source"] == "iol"


def test_cedear_never_uses_alpha_vantage_as_local_quote(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch,
) -> None:
    asset = client.post(
        "/investments/assets",
        headers=auth_headers,
        json={"name": "Apple CEDEAR", "symbol": "AAPL", "asset_type": "cedear", "currency": "ARS", "risk_level": "medium", "current_price": "12000"},
    ).json()
    client.patch(
        "/market-data/integrations/alphavantage",
        headers=auth_headers,
        json={"enabled": True, "api_key": "fake-alpha-key"},
    )

    def fail_if_called(*args, **kwargs):
        raise AssertionError("Alpha Vantage must not price CEDEARs")

    monkeypatch.setattr("app.services.market_data.ExternalMarketDataProvider.fetch_stock_price", fail_if_called)
    response = client.post("/market-data/refresh-prices", headers=auth_headers)
    assert response.status_code == 200
    quote = response.json()["quotes"][0]
    assert quote["status"] == "skipped"
    assert "IOL" in quote["message"]
    unchanged = client.get("/investments/assets", headers=auth_headers).json()[0]
    assert unchanged["id"] == asset["id"]
    assert unchanged["current_price"] == "12000.0000"
    assert unchanged["price_source"] == "manual"


def test_cedear_refresh_uses_iol_ars_quote_for_portfolio(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch,
) -> None:
    asset = client.post(
        "/investments/assets",
        headers=auth_headers,
        json={"name": "Apple CEDEAR", "symbol": "AAPL", "asset_type": "cedear", "currency": "ARS", "risk_level": "medium"},
    ).json()
    client.post(
        "/investments/operations",
        headers=auth_headers,
        json={"asset_id": asset["id"], "operation_type": "buy", "quantity": "2", "unit_price": "10000", "fees": "0", "operation_date": "2026-10-26"},
    )
    client.patch(
        "/market-data/integrations/iol",
        headers=auth_headers,
        json={"enabled": True, "username": "fake-user", "password": "fake-password"},
    )

    def fake_iol(self, symbol, currency, username, password, market="BCBA", require_currency=False):
        from datetime import datetime, timezone

        assert (symbol, currency, market) == ("AAPL", "ARS", "BCBA")
        assert require_currency is True
        return ProviderQuote("iol", Decimal("12500"), "ARS", datetime(2026, 10, 26, tzinfo=timezone.utc))

    monkeypatch.setattr("app.services.market_data.ExternalMarketDataProvider.fetch_iol_price", fake_iol)
    response = client.post("/market-data/refresh-prices", headers=auth_headers)
    assert response.json()["updated_count"] == 1
    position = client.get("/investments/portfolio", headers=auth_headers).json()["positions"][0]
    assert position["currency"] == "ARS"
    assert position["estimated_value"] == "25000.00"


def test_cedear_rejects_wrong_quote_currency_without_overwriting_price(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch,
) -> None:
    client.post(
        "/investments/assets",
        headers=auth_headers,
        json={"name": "Apple CEDEAR", "symbol": "AAPL", "asset_type": "cedear", "currency": "ARS", "risk_level": "medium", "current_price": "11000"},
    )
    client.patch(
        "/market-data/integrations/iol",
        headers=auth_headers,
        json={"enabled": True, "username": "fake-user", "password": "fake-password"},
    )

    def wrong_currency(self, symbol, currency, username, password, market="BCBA", require_currency=False):
        from datetime import datetime, timezone

        return ProviderQuote("iol", Decimal("200"), "USD", datetime(2026, 10, 26, tzinfo=timezone.utc))

    monkeypatch.setattr("app.services.market_data.ExternalMarketDataProvider.fetch_iol_price", wrong_currency)
    response = client.post("/market-data/refresh-prices", headers=auth_headers)
    assert response.json()["failed_count"] == 1
    unchanged = client.get("/investments/assets", headers=auth_headers).json()[0]
    assert unchanged["current_price"] == "11000.0000"
    assert unchanged["price_source"] == "manual"


def test_cedear_usd_variant_stays_manual_until_currency_supported(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    client.post(
        "/investments/assets",
        headers=auth_headers,
        json={"name": "Apple USD CEDEAR", "symbol": "AAPLD", "asset_type": "cedear", "currency": "USD", "risk_level": "medium", "current_price": "15"},
    )
    response = client.post("/market-data/refresh-prices", headers=auth_headers)
    assert response.json()["skipped_count"] == 1
    assert "ARS only" in response.json()["quotes"][0]["message"]


def test_market_data_refresh_reports_missing_iol_credentials(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    client.post(
        "/investments/assets",
        headers=auth_headers,
        json={
            "name": "YPF",
            "symbol": "YPFD",
            "asset_type": "stock",
            "currency": "ARS",
            "risk_level": "medium",
            "current_price": "1000.0000",
        },
    )
    client.patch(
        "/market-data/integrations/iol",
        headers=auth_headers,
        json={"enabled": True, "clear_api_key": True},
    )

    refresh_response = client.post("/market-data/refresh-prices", headers=auth_headers)

    assert refresh_response.status_code == 200
    body = refresh_response.json()
    assert body["updated_count"] == 0
    assert body["failed_count"] == 1
    assert body["quotes"][0]["status"] == "failed"
    assert body["quotes"][0]["message"] == "IOL username and password are required"


def test_disabled_market_provider_is_not_used_for_refresh(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    client.post(
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
    client.patch(
        "/market-data/integrations/coingecko",
        headers=auth_headers,
        json={"enabled": False},
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

    integrations_response = client.get("/market-data/integrations")

    assert integrations_response.status_code == 401

    update_response = client.patch("/market-data/integrations/coingecko", json={"enabled": False})

    assert update_response.status_code == 401
