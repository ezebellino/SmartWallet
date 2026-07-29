from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session, sessionmaker

from app.models.market_data_sync import MarketDataSyncRun
from app.core.config import settings
from app.services.market_data import ProviderQuote
from app.services.market_data_scheduler import MARKET_DATA_REFRESH_JOB_KEY, MarketDataAutoRefreshRunner


def test_market_data_auto_refresh_runs_when_due(
    db_session: Session,
    auth_headers: dict[str, str],
    client,
    monkeypatch,
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

    def fake_fetch_crypto_price(self, symbol: str, currency: str) -> ProviderQuote:
        return ProviderQuote(
            provider="coingecko",
            price=Decimal("70000.0000"),
            currency="USD",
            fetched_at=datetime(2026, 7, 29, tzinfo=timezone.utc),
        )

    monkeypatch.setattr(
        "app.services.market_data.ExternalMarketDataProvider.fetch_crypto_price",
        fake_fetch_crypto_price,
    )

    runner = MarketDataAutoRefreshRunner(sessionmaker(bind=db_session.bind), interval_minutes=90)
    sync_run = runner.run_if_due()

    assert sync_run.job_key == MARKET_DATA_REFRESH_JOB_KEY
    assert sync_run.status == "success"
    assert "updated=1" in (sync_run.last_message or "")
    assert sync_run.last_success_at is not None

    assets_response = client.get("/investments/assets", headers=auth_headers)
    assert assets_response.json()[0]["current_price"] == "70000.0000"


def test_market_data_auto_refresh_skips_when_not_due(db_session: Session) -> None:
    now = datetime.now(timezone.utc)
    db_session.add(
        MarketDataSyncRun(
            job_key=MARKET_DATA_REFRESH_JOB_KEY,
            status="success",
            last_finished_at=now - timedelta(minutes=10),
            last_success_at=now - timedelta(minutes=10),
            last_message="recent run",
        )
    )
    db_session.commit()

    runner = MarketDataAutoRefreshRunner(sessionmaker(bind=db_session.bind), interval_minutes=90)
    sync_run = runner.run_if_due()

    assert sync_run.status == "success"
    assert sync_run.last_message == "recent run"


def test_market_data_auto_refresh_records_user_errors(
    db_session: Session,
    auth_headers: dict[str, str],
    client,
    monkeypatch,
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

    def fake_fetch_crypto_price(self, symbol: str, currency: str) -> ProviderQuote:
        raise RuntimeError("provider unavailable")

    monkeypatch.setattr(
        "app.services.market_data.ExternalMarketDataProvider.fetch_crypto_price",
        fake_fetch_crypto_price,
    )

    runner = MarketDataAutoRefreshRunner(sessionmaker(bind=db_session.bind), interval_minutes=90)
    sync_run = runner.run_if_due()

    assert sync_run.status == "success"
    assert "failed=1" in (sync_run.last_message or "")


def test_market_data_auto_refresh_status_endpoint(
    client,
    auth_headers: dict[str, str],
    monkeypatch,
) -> None:
    monkeypatch.setattr(settings, "market_data_auto_refresh_enabled", True)
    monkeypatch.setattr(settings, "market_data_refresh_interval_minutes", 90)
    monkeypatch.setattr(settings, "market_data_refresh_startup_delay_seconds", 5.0)

    response = client.get("/market-data/auto-refresh/status", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is True
    assert body["interval_minutes"] == 90
    assert body["startup_delay_seconds"] == 5.0
    assert body["status"] == "idle"
    assert body["last_started_at"] is None


def test_market_data_auto_refresh_status_requires_auth(client) -> None:
    response = client.get("/market-data/auto-refresh/status")

    assert response.status_code == 401
