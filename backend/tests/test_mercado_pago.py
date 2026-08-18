from datetime import date

from sqlalchemy.orm import Session

from app.services.mercado_pago import MercadoPagoProvider


class FakeMercadoPagoProvider(MercadoPagoProvider):
    def __init__(self, csv_text: str, reports: list[dict] | None = None) -> None:
        self.csv_text = csv_text
        self.reports = reports
        self.requested_reports: list[tuple[date, date]] = []
        self.configured = True

    def request_account_money_report(self, access_token: str, begin_date: date, end_date: date) -> None:
        self.ensure_account_money_report_config(access_token)
        self.requested_reports.append((begin_date, end_date))

    def list_account_money_reports(self, access_token: str) -> list[dict]:
        return self.reports if self.reports is not None else [
            {
                "id": 1,
                "file_name": "settlement-report-test.csv",
                "begin_date": "2026-08-01T00:00:00Z",
                "end_date": "2026-08-11T23:59:59Z",
                "created_from": "manual",
                "date_created": "2026-08-11T10:00:00Z",
            }
        ]

    def download_account_money_report(self, access_token: str, file_name: str) -> str:
        return self.csv_text

    def ensure_account_money_report_config(self, access_token: str) -> None:
        self.configured = True


class UnconfiguredMercadoPagoProvider(FakeMercadoPagoProvider):
    def __init__(self) -> None:
        super().__init__("", reports=[])
        self.configured = False
        self.created_config = False

    def ensure_account_money_report_config(self, access_token: str) -> None:
        self.created_config = True
        self.configured = True

    def request_account_money_report(self, access_token: str, begin_date: date, end_date: date) -> None:
        self.ensure_account_money_report_config(access_token)
        assert self.configured
        super().request_account_money_report(access_token, begin_date, end_date)


def test_mercado_pago_requires_token(client) -> None:
    response = client.get("/mercado-pago/reports")

    assert response.status_code == 401


def test_mercado_pago_integration_stores_token_without_exposing_it(client, auth_headers) -> None:
    response = client.patch(
        "/mercado-pago/integration",
        headers=auth_headers,
        json={"enabled": True, "access_token": "APP_USR-1234567890abcdef"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "enabled": True,
        "status": "active",
        "has_access_token": True,
        "access_token_last4": "cdef",
    }

    read_response = client.get("/mercado-pago/integration", headers=auth_headers)

    assert read_response.status_code == 200
    assert "APP_USR" not in read_response.text


def test_mercado_pago_imports_report_and_skips_duplicates(client, auth_headers, db_session: Session) -> None:
    csv_text = "\n".join(
        [
            "SOURCE_ID;EXTERNAL_REFERENCE;TRANSACTION_TYPE;TRANSACTION_AMOUNT;TRANSACTION_CURRENCY;TRANSACTION_DATE;SETTLEMENT_NET_AMOUNT",
            "mp-income-1;salary-transfer;SETTLEMENT;100000.00;ARS;2026-08-05T13:00:00.000-03:00;100000.00",
            "mp-expense-1;market-buy;SETTLEMENT;-12500.50;ARS;2026-08-06T18:30:00.000-03:00;-12500.50",
        ]
    )

    client.patch(
        "/mercado-pago/integration",
        headers=auth_headers,
        json={"enabled": True, "access_token": "APP_USR-1234567890abcdef"},
    )
    from app.routers.mercado_pago import get_mercado_pago_service
    from app.services.mercado_pago import MercadoPagoService
    from app.main import app

    fake_provider = FakeMercadoPagoProvider(csv_text)

    def override_service() -> MercadoPagoService:
        return MercadoPagoService(db_session, provider=fake_provider)

    app.dependency_overrides[get_mercado_pago_service] = override_service
    try:
        response = client.post("/mercado-pago/import", headers=auth_headers, json={})
        duplicate_response = client.post("/mercado-pago/import", headers=auth_headers, json={})
    finally:
        app.dependency_overrides.pop(get_mercado_pago_service, None)

    assert response.status_code == 200
    body = response.json()
    assert body["imported_count"] == 2
    assert body["skipped_count"] == 0
    assert body["failed_count"] == 0

    assert duplicate_response.status_code == 200
    duplicate_body = duplicate_response.json()
    assert duplicate_body["imported_count"] == 0
    assert duplicate_body["skipped_count"] == 2


def test_mercado_pago_sync_imports_matching_report(client, auth_headers, db_session: Session) -> None:
    csv_text = "\n".join(
        [
            "SOURCE_ID;EXTERNAL_REFERENCE;TRANSACTION_TYPE;TRANSACTION_AMOUNT;TRANSACTION_CURRENCY;TRANSACTION_DATE;SETTLEMENT_NET_AMOUNT",
            "mp-sync-income-1;salary-transfer;SETTLEMENT;250000.00;ARS;2026-08-05T13:00:00.000-03:00;250000.00",
        ]
    )

    client.patch(
        "/mercado-pago/integration",
        headers=auth_headers,
        json={"enabled": True, "access_token": "APP_USR-1234567890abcdef"},
    )
    from app.routers.mercado_pago import get_mercado_pago_service
    from app.services.mercado_pago import MercadoPagoService
    from app.main import app

    fake_provider = FakeMercadoPagoProvider(csv_text)

    def override_service() -> MercadoPagoService:
        return MercadoPagoService(db_session, provider=fake_provider)

    app.dependency_overrides[get_mercado_pago_service] = override_service
    try:
        response = client.post(
            "/mercado-pago/sync",
            headers=auth_headers,
            json={"begin_date": "2026-08-01", "end_date": "2026-08-11"},
        )
    finally:
        app.dependency_overrides.pop(get_mercado_pago_service, None)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "imported"
    assert body["report_requested"] is False
    assert body["import_result"]["imported_count"] == 1


def test_mercado_pago_sync_requests_report_when_no_matching_file(client, auth_headers, db_session: Session) -> None:
    client.patch(
        "/mercado-pago/integration",
        headers=auth_headers,
        json={"enabled": True, "access_token": "APP_USR-1234567890abcdef"},
    )
    from app.routers.mercado_pago import get_mercado_pago_service
    from app.services.mercado_pago import MercadoPagoService
    from app.main import app

    fake_provider = FakeMercadoPagoProvider("", reports=[])

    def override_service() -> MercadoPagoService:
        return MercadoPagoService(db_session, provider=fake_provider)

    app.dependency_overrides[get_mercado_pago_service] = override_service
    try:
        response = client.post(
            "/mercado-pago/sync",
            headers=auth_headers,
            json={"begin_date": "2026-08-01", "end_date": "2026-08-31"},
        )
    finally:
        app.dependency_overrides.pop(get_mercado_pago_service, None)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending"
    assert body["report_requested"] is True
    assert body["import_result"] is None
    assert fake_provider.requested_reports == [(date(2026, 8, 1), date(2026, 8, 31))]


def test_mercado_pago_request_report_ensures_report_configuration(client, auth_headers, db_session: Session) -> None:
    client.patch(
        "/mercado-pago/integration",
        headers=auth_headers,
        json={"enabled": True, "access_token": "APP_USR-1234567890abcdef"},
    )
    from app.routers.mercado_pago import get_mercado_pago_service
    from app.services.mercado_pago import MercadoPagoService
    from app.main import app

    fake_provider = UnconfiguredMercadoPagoProvider()

    def override_service() -> MercadoPagoService:
        return MercadoPagoService(db_session, provider=fake_provider)

    app.dependency_overrides[get_mercado_pago_service] = override_service
    try:
        response = client.post(
            "/mercado-pago/reports",
            headers=auth_headers,
            json={"begin_date": "2026-08-01", "end_date": "2026-08-31"},
        )
    finally:
        app.dependency_overrides.pop(get_mercado_pago_service, None)

    assert response.status_code == 202
    assert fake_provider.created_config is True
    assert fake_provider.requested_reports == [(date(2026, 8, 1), date(2026, 8, 31))]
