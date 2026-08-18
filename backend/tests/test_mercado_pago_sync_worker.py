from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.models.job_run import JobRun
from app.models.transaction import Transaction
from app.services.mercado_pago_sync_worker import MERCADO_PAGO_SYNC_JOB_KEY, MercadoPagoSyncWorker


class FakeMercadoPagoWorkerProvider:
    def __init__(self) -> None:
        self.requested_reports: list[tuple] = []

    def request_account_money_report(self, access_token, begin_date, end_date) -> None:
        self.requested_reports.append((begin_date, end_date))

    def list_account_money_reports(self, access_token) -> list[dict]:
        now = datetime.now(timezone.utc)
        return [
            {
                "id": 1,
                "file_name": "settlement-report-worker.csv",
                "begin_date": (now - timedelta(days=40)).isoformat(),
                "end_date": now.isoformat(),
                "created_from": "automatic",
                "date_created": now.isoformat(),
            }
        ]

    def download_account_money_report(self, access_token, file_name) -> str:
        now = datetime.now(timezone.utc).isoformat()
        return "\n".join(
            [
                "SOURCE_ID;EXTERNAL_REFERENCE;TRANSACTION_TYPE;TRANSACTION_AMOUNT;TRANSACTION_CURRENCY;TRANSACTION_DATE;SETTLEMENT_NET_AMOUNT",
                f"mp-worker-income-1;wallet-income;SETTLEMENT;150000.00;ARS;{now};150000.00",
                f"mp-worker-expense-1;wallet-expense;SETTLEMENT;-22000.00;ARS;{now};-22000.00",
            ]
        )


class PendingMercadoPagoWorkerProvider(FakeMercadoPagoWorkerProvider):
    def list_account_money_reports(self, access_token) -> list[dict]:
        return []


class FailingMercadoPagoWorkerProvider(FakeMercadoPagoWorkerProvider):
    def list_account_money_reports(self, access_token) -> list[dict]:
        raise RuntimeError("mercado pago unavailable")


def configure_mercado_pago(client, auth_headers: dict[str, str]) -> None:
    response = client.patch(
        "/mercado-pago/integration",
        headers=auth_headers,
        json={"enabled": True, "access_token": "APP_USR-1234567890abcdef"},
    )
    assert response.status_code == 200


def test_mercado_pago_sync_worker_imports_movements_and_skips_duplicates(
    client,
    db_session: Session,
    auth_headers: dict[str, str],
) -> None:
    configure_mercado_pago(client, auth_headers)
    worker = MercadoPagoSyncWorker(
        sessionmaker(bind=db_session.bind),
        provider_factory=FakeMercadoPagoWorkerProvider,
        lookback_days=3,
    )

    first_run = worker.run_once()
    second_run = worker.run_once()

    assert first_run.job_key == MERCADO_PAGO_SYNC_JOB_KEY
    assert first_run.status == "success"
    assert first_run.users_processed == 1
    assert first_run.success_count == 1
    assert first_run.failure_count == 0
    assert first_run.details is not None
    assert first_run.details["users"][0]["status"] == "imported"
    assert first_run.details["users"][0]["imported_count"] == 2
    assert first_run.details["users"][0]["skipped_count"] == 0

    assert second_run.status == "success"
    assert second_run.details is not None
    assert second_run.details["users"][0]["imported_count"] == 0
    assert second_run.details["users"][0]["skipped_count"] == 2

    transactions = list(db_session.scalars(select(Transaction).order_by(Transaction.id)).all())
    job_runs = list(db_session.scalars(select(JobRun).order_by(JobRun.id)).all())

    assert [transaction.external_source for transaction in transactions] == ["mercado_pago", "mercado_pago"]
    assert len(job_runs) == 2


def test_mercado_pago_sync_worker_requests_report_when_none_is_ready(
    client,
    db_session: Session,
    auth_headers: dict[str, str],
) -> None:
    configure_mercado_pago(client, auth_headers)
    worker = MercadoPagoSyncWorker(
        sessionmaker(bind=db_session.bind),
        provider_factory=PendingMercadoPagoWorkerProvider,
        lookback_days=3,
    )

    run = worker.run_once()

    assert run.status == "success"
    assert run.details is not None
    assert run.details["users"][0]["status"] == "pending"
    assert run.details["users"][0]["report_requested"] is True
    assert run.details["users"][0]["imported_count"] == 0


def test_mercado_pago_sync_worker_records_user_failures(
    client,
    db_session: Session,
    auth_headers: dict[str, str],
) -> None:
    configure_mercado_pago(client, auth_headers)
    worker = MercadoPagoSyncWorker(
        sessionmaker(bind=db_session.bind),
        provider_factory=FailingMercadoPagoWorkerProvider,
        lookback_days=3,
    )

    run = worker.run_once()

    assert run.status == "failed"
    assert run.users_processed == 1
    assert run.success_count == 0
    assert run.failure_count == 1
    assert run.details is not None
    assert run.details["users"][0]["status"] == "failed"
    assert "mercado pago unavailable" in run.details["users"][0]["error"]


def test_mercado_pago_sync_worker_succeeds_with_no_configured_users(db_session: Session) -> None:
    worker = MercadoPagoSyncWorker(
        sessionmaker(bind=db_session.bind),
        provider_factory=FakeMercadoPagoWorkerProvider,
    )

    run = worker.run_once()

    assert run.status == "success"
    assert run.users_processed == 0
    assert run.message == "No Mercado Pago users configured"


def test_jobs_api_runs_mercado_pago_sync_and_lists_history(client, auth_headers: dict[str, str], monkeypatch) -> None:
    configure_mercado_pago(client, auth_headers)

    monkeypatch.setattr(
        "app.services.mercado_pago.MercadoPagoProvider.list_account_money_reports",
        lambda self, access_token: FakeMercadoPagoWorkerProvider().list_account_money_reports(access_token),
    )
    monkeypatch.setattr(
        "app.services.mercado_pago.MercadoPagoProvider.download_account_money_report",
        lambda self, access_token, file_name: FakeMercadoPagoWorkerProvider().download_account_money_report(
            access_token,
            file_name,
        ),
    )
    monkeypatch.setattr(
        "app.services.mercado_pago.MercadoPagoProvider.request_account_money_report",
        lambda self, access_token, begin_date, end_date: None,
    )

    run_response = client.post("/jobs/mercado-pago-sync/run", headers=auth_headers)
    list_response = client.get("/jobs/runs?job_key=mercado_pago_sync", headers=auth_headers)
    status_response = client.get("/jobs/mercado-pago-sync/status", headers=auth_headers)

    assert run_response.status_code == 200
    assert run_response.json()["job_key"] == "mercado_pago_sync"
    assert run_response.json()["status"] == "success"
    assert run_response.json()["details"]["users"][0]["imported_count"] == 2
    assert list_response.status_code == 200
    assert list_response.json()[0]["id"] == run_response.json()["id"]
    assert status_response.status_code == 200
    assert status_response.json()["job_key"] == "mercado_pago_sync"
