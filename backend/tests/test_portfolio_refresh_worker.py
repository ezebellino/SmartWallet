from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.models.job_run import JobRun
from app.models.notification import Notification
from app.repositories.binance import BinanceRepository
from app.services.binance import BinanceCredentials, BinanceService
from app.services.portfolio_refresh_worker import PORTFOLIO_REFRESH_JOB_KEY, PortfolioRefreshWorker


class FakeWorkerBinanceClient:
    prices = {
        "BTCUSDT": Decimal("60000"),
        "USDTUSDT": Decimal("1"),
    }

    def account_info(self, credentials: BinanceCredentials) -> dict:
        return {
            "accountType": "SPOT",
            "canTrade": False,
            "canDeposit": True,
            "canWithdraw": False,
            "permissions": ["SPOT"],
            "balances": [
                {"asset": "BTC", "free": "0.01000000", "locked": "0.00000000"},
                {"asset": "USDT", "free": "25.00000000", "locked": "0.00000000"},
            ],
        }

    def ticker_price(self, symbol: str) -> Decimal:
        if symbol not in self.prices:
            raise ValueError("missing fake price")
        return self.prices[symbol]


class FailingWorkerBinanceClient(FakeWorkerBinanceClient):
    def account_info(self, credentials: BinanceCredentials) -> dict:
        raise RuntimeError("binance unavailable")


def configure_binance(client, auth_headers: dict[str, str]) -> None:
    response = client.patch(
        "/binance/integration",
        headers=auth_headers,
        json={"enabled": True, "api_key": "test-api-key", "api_secret": "test-api-secret"},
    )
    assert response.status_code == 200


def test_portfolio_refresh_worker_syncs_binance_and_generates_notifications(
    client,
    db_session: Session,
    auth_headers: dict[str, str],
) -> None:
    configure_binance(client, auth_headers)
    worker = PortfolioRefreshWorker(
        sessionmaker(bind=db_session.bind),
        binance_client_factory=FakeWorkerBinanceClient,
    )

    first_run = worker.run_once()
    second_run = worker.run_once()

    assert first_run.job_key == PORTFOLIO_REFRESH_JOB_KEY
    assert first_run.status == "success"
    assert first_run.users_processed == 1
    assert first_run.success_count == 1
    assert first_run.failure_count == 0
    assert first_run.details is not None
    assert first_run.details["users"][0]["synced_count"] == 2
    assert first_run.details["users"][0]["notifications_generated_count"] == 1

    assert second_run.status == "success"
    assert second_run.details is not None
    assert second_run.details["users"][0]["notifications_generated_count"] == 0

    snapshots = BinanceRepository(db_session).list_balance_snapshots(user_id=1, limit=10)
    notifications = list(db_session.scalars(select(Notification)).all())
    job_runs = list(db_session.scalars(select(JobRun).order_by(JobRun.id)).all())

    assert {snapshot.asset for snapshot in snapshots} == {"BTC", "USDT"}
    assert [notification.type.value for notification in notifications] == ["binance_portfolio_alert"]
    assert len(job_runs) == 2


def test_portfolio_refresh_worker_records_user_failures(
    client,
    db_session: Session,
    auth_headers: dict[str, str],
) -> None:
    configure_binance(client, auth_headers)
    worker = PortfolioRefreshWorker(
        sessionmaker(bind=db_session.bind),
        binance_client_factory=FailingWorkerBinanceClient,
    )

    run = worker.run_once()

    assert run.status == "failed"
    assert run.users_processed == 1
    assert run.success_count == 0
    assert run.failure_count == 1
    assert run.details is not None
    assert run.details["users"][0]["status"] == "failed"
    assert "binance unavailable" in run.details["users"][0]["error"]


def test_portfolio_refresh_worker_succeeds_with_no_configured_users(db_session: Session) -> None:
    worker = PortfolioRefreshWorker(
        sessionmaker(bind=db_session.bind),
        binance_client_factory=FakeWorkerBinanceClient,
    )

    run = worker.run_once()

    assert run.status == "success"
    assert run.users_processed == 0
    assert run.message == "No Binance users configured"


def test_jobs_api_runs_portfolio_refresh_and_lists_history(
    client,
    auth_headers: dict[str, str],
    monkeypatch,
) -> None:
    configure_binance(client, auth_headers)

    monkeypatch.setattr(
        "app.services.binance.BinanceClient.account_info",
        lambda self, credentials: FakeWorkerBinanceClient().account_info(credentials),
    )
    monkeypatch.setattr(
        "app.services.binance.BinanceClient.ticker_price",
        lambda self, symbol: FakeWorkerBinanceClient().ticker_price(symbol),
    )

    run_response = client.post("/jobs/portfolio-refresh/run", headers=auth_headers)
    list_response = client.get("/jobs/runs?job_key=portfolio_refresh", headers=auth_headers)

    assert run_response.status_code == 200
    assert run_response.json()["job_key"] == "portfolio_refresh"
    assert run_response.json()["status"] == "success"
    assert run_response.json()["users_processed"] == 1
    assert run_response.json()["details"]["users"][0]["synced_count"] == 2
    assert list_response.status_code == 200
    assert list_response.json()[0]["id"] == run_response.json()["id"]


def test_jobs_api_requires_auth(client) -> None:
    assert client.post("/jobs/portfolio-refresh/run").status_code == 401
    assert client.get("/jobs/runs").status_code == 401
