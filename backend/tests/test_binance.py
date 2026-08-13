from app.repositories.binance import BinanceRepository
from app.routers.binance import get_binance_service
from app.services.binance import BinanceCredentials, BinanceService


class FakeBinanceClient:
    prices = {
        "BTCUSDT": "60000",
        "ETHUSDT": "3000",
        "SHIBUSDT": "0.00000450",
        "USDTUSDT": "1",
    }

    def account_info(self, credentials: BinanceCredentials) -> dict:
        assert credentials.api_key == "test-api-key"
        assert credentials.api_secret == "test-api-secret"
        return {
            "accountType": "SPOT",
            "canTrade": False,
            "canDeposit": True,
            "canWithdraw": False,
            "permissions": ["SPOT"],
            "balances": [
                {"asset": "BTC", "free": "0.01000000", "locked": "0.00000000"},
                {"asset": "USDT", "free": "25.50000000", "locked": "1.00000000"},
                {"asset": "ETH", "free": "0.00000000", "locked": "0.00000000"},
            ],
        }

    def ticker_price(self, symbol: str):
        from decimal import Decimal

        if symbol not in self.prices:
            raise ValueError("missing fake price")
        return Decimal(self.prices[symbol])


def test_binance_integration_syncs_balances_without_exposing_secret(client, db_session, auth_headers) -> None:
    def override_service():
        return BinanceService(db_session, BinanceRepository(db_session), FakeBinanceClient())

    from app.main import app

    app.dependency_overrides[get_binance_service] = override_service

    try:
        integration_response = client.patch(
            "/binance/integration",
            headers=auth_headers,
            json={
                "enabled": True,
                "api_key": "test-api-key",
                "api_secret": "test-api-secret",
            },
        )
        account_response = client.get("/binance/account", headers=auth_headers)
        sync_response = client.post("/binance/sync-balances", headers=auth_headers)
        second_sync_response = client.post("/binance/sync-balances", headers=auth_headers)
        summary_response = client.get("/binance/portfolio-summary", headers=auth_headers)
        snapshots_response = client.get("/binance/balance-snapshots", headers=auth_headers)
        notifications_response = client.get("/notifications", headers=auth_headers)
    finally:
        app.dependency_overrides.pop(get_binance_service, None)

    assert integration_response.status_code == 200
    assert integration_response.json() == {
        "enabled": True,
        "status": "active",
        "has_api_key": True,
        "api_key_last4": "-key",
        "last_sync_at": None,
    }
    assert account_response.status_code == 200
    assert account_response.json()["account_type"] == "SPOT"
    assert [balance["asset"] for balance in account_response.json()["balances"]] == ["USDT", "BTC"]
    assert "api_secret" not in str(integration_response.json()).lower()
    assert sync_response.status_code == 200
    assert sync_response.json()["synced_count"] == 2
    assert sync_response.json()["notifications_generated_count"] == 1
    assert second_sync_response.status_code == 200
    assert second_sync_response.json()["notifications_generated_count"] == 0
    assert summary_response.status_code == 200
    assert summary_response.json()["asset_count"] == 2
    assert summary_response.json()["total_estimated_value_usd"] == "626.5000000000"
    assert summary_response.json()["holdings"][0]["asset"] == "BTC"
    assert summary_response.json()["alerts"][0]["type"] == "high_concentration"
    assert snapshots_response.status_code == 200
    assert {snapshot["asset"] for snapshot in snapshots_response.json()} == {"BTC", "USDT"}
    assert any(item["type"] == "binance_portfolio_alert" for item in notifications_response.json())


def test_binance_account_requires_credentials(client, auth_headers) -> None:
    response = client.get("/binance/account", headers=auth_headers)

    assert response.status_code == 400
    assert response.json()["detail"] == "Binance integration is disabled"


def test_binance_portfolio_prices_locked_earn_assets(client, db_session, auth_headers) -> None:
    def override_service():
        return BinanceService(db_session, BinanceRepository(db_session), FakeBinanceClient())

    from app.main import app

    repository = BinanceRepository(db_session)
    from datetime import datetime, timezone
    from decimal import Decimal

    from sqlalchemy import select

    from app.models.user import User

    user = db_session.scalar(select(User).where(User.email == "user@example.com"))
    assert user is not None
    repository.create_balance_snapshots(
        user_id=user.id,
        balances=[
            ("LDBTC", Decimal("0.0100000000"), Decimal("0"), Decimal("0.0100000000")),
            ("LDUSDT", Decimal("25.5000000000"), Decimal("1.0000000000"), Decimal("26.5000000000")),
            ("LDWBETH", Decimal("0.1000000000"), Decimal("0"), Decimal("0.1000000000")),
            ("LDSHIB2", Decimal("1000000.0000000000"), Decimal("0"), Decimal("1000000.0000000000")),
        ],
        fetched_at=datetime(2026, 8, 11, 12, 0, tzinfo=timezone.utc),
    )
    app.dependency_overrides[get_binance_service] = override_service
    try:
        summary_response = client.get("/binance/portfolio-summary", headers=auth_headers)
    finally:
        app.dependency_overrides.pop(get_binance_service, None)

    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["priced_asset_count"] == 4
    assert summary["unpriced_asset_count"] == 0
    assert summary["total_estimated_value_usd"] == "931.000000000000000000"
    prices_by_asset = {holding["asset"]: holding["price_usd"] for holding in summary["holdings"]}
    assert prices_by_asset["LDBTC"] == "60000"
    assert prices_by_asset["LDUSDT"] == "1"
    assert prices_by_asset["LDWBETH"] == "3000"
    assert prices_by_asset["LDSHIB2"] == "0.00000450"
