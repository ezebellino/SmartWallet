from datetime import date, timedelta

import httpx

from sqlalchemy.orm import Session

from app.services.mercado_pago import MercadoPagoProvider


class FakeMercadoPagoProvider(MercadoPagoProvider):
    def __init__(
        self,
        csv_text: str,
        reports: list[dict] | None = None,
        payment_details: dict[str, dict] | None = None,
    ) -> None:
        self.csv_text = csv_text
        self.reports = reports
        self.payment_details = payment_details or {}
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

    def get_payment_detail(self, access_token: str, payment_id: str) -> dict | None:
        return self.payment_details.get(payment_id)


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
    assert body["row_count"] == 2
    assert body["first_movement_date"] == "2026-08-05"
    assert body["latest_movement_date"] == "2026-08-06"

    assert duplicate_response.status_code == 200
    duplicate_body = duplicate_response.json()
    assert duplicate_body["imported_count"] == 0
    assert duplicate_body["skipped_count"] == 2
    assert duplicate_body["row_count"] == 2


def test_mercado_pago_import_uses_human_readable_description(client, auth_headers, db_session: Session) -> None:
    csv_text = "\n".join(
        [
            "SOURCE_ID;EXTERNAL_REFERENCE;TRANSACTION_TYPE;TRANSACTION_AMOUNT;TRANSACTION_CURRENCY;TRANSACTION_DATE;SETTLEMENT_NET_AMOUNT;DESCRIPTION;PAYER_NAME;STORE_NAME",
            "mp-store-1;;SETTLEMENT;-2114.00;ARS;2026-08-18T13:00:00.000-03:00;-2114.00;Cafe Martinez;;Sucursal Centro",
            "mp-transfer-1;;SETTLEMENT;50000.00;ARS;2026-08-18T14:00:00.000-03:00;50000.00;SETTLEMENT;Juan Perez;",
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
    finally:
        app.dependency_overrides.pop(get_mercado_pago_service, None)

    assert response.status_code == 200
    movements = response.json()["movements"]
    assert movements[0]["description"] == "Mercado Pago - Cafe Martinez"
    assert movements[1]["description"] == "Mercado Pago - Juan Perez"


def test_mercado_pago_provider_updates_old_report_config(monkeypatch) -> None:
    requests: list[tuple[str, str, dict | None]] = []

    def fake_get(url: str, headers: dict, timeout: float) -> httpx.Response:
        requests.append(("GET", url, None))
        request = httpx.Request("GET", url)
        return httpx.Response(
            200,
            request=request,
            json={
                "columns": [{"key": "SOURCE_ID"}],
                "file_name_prefix": "settlement-report",
                "frequency": {"hour": 0, "value": 1, "type": "monthly"},
                "separator": ";",
                "display_timezone": "GMT-03",
                "report_translation": "es",
                "header_language": "es",
                "scheduled": False,
            },
        )

    def fake_put(url: str, headers: dict, json: dict, timeout: float) -> httpx.Response:
        requests.append(("PUT", url, json))
        return httpx.Response(200, request=httpx.Request("PUT", url), json=json)

    monkeypatch.setattr(httpx, "get", fake_get)
    monkeypatch.setattr(httpx, "put", fake_put)

    MercadoPagoProvider().ensure_account_money_report_config("APP_USR-test")

    assert [method for method, _, _ in requests] == ["GET", "PUT"]
    updated_payload = requests[1][2]
    assert updated_payload is not None
    updated_columns = {column["key"] for column in updated_payload["columns"]}
    assert {"DESCRIPTION", "PAYER_NAME", "STORE_NAME", "POS_NAME"}.issubset(updated_columns)


def test_mercado_pago_normalizes_existing_technical_descriptions(client, auth_headers, db_session: Session) -> None:
    old_csv = "\n".join(
        [
            "SOURCE_ID;EXTERNAL_REFERENCE;TRANSACTION_TYPE;TRANSACTION_AMOUNT;TRANSACTION_CURRENCY;TRANSACTION_DATE;SETTLEMENT_NET_AMOUNT",
            "mp-old-1;;SETTLEMENT;-2114.00;ARS;2026-08-18T13:00:00.000-03:00;-2114.00",
        ]
    )
    enriched_csv = "\n".join(
        [
            "SOURCE_ID;EXTERNAL_REFERENCE;TRANSACTION_TYPE;TRANSACTION_AMOUNT;TRANSACTION_CURRENCY;TRANSACTION_DATE;SETTLEMENT_NET_AMOUNT;DESCRIPTION;PAYER_NAME",
            "mp-old-1;;SETTLEMENT;-2114.00;ARS;2026-08-18T13:00:00.000-03:00;-2114.00;Cafe Martinez;",
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

    provider = FakeMercadoPagoProvider(old_csv)

    def override_service() -> MercadoPagoService:
        return MercadoPagoService(db_session, provider=provider)

    app.dependency_overrides[get_mercado_pago_service] = override_service
    try:
        import_response = client.post("/mercado-pago/import", headers=auth_headers, json={})
        provider.csv_text = enriched_csv
        preview_response = client.post("/mercado-pago/normalize-preview", headers=auth_headers, json={})
        apply_response = client.post("/mercado-pago/normalize", headers=auth_headers, json={})
        second_preview_response = client.post("/mercado-pago/normalize-preview", headers=auth_headers, json={})
    finally:
        app.dependency_overrides.pop(get_mercado_pago_service, None)

    assert import_response.status_code == 200
    transaction_id = import_response.json()["movements"][0]["transaction_id"]
    assert import_response.json()["movements"][0]["description"] == "Mercado Pago - SETTLEMENT | source mp-old-1"

    assert preview_response.status_code == 200
    preview_body = preview_response.json()
    assert preview_body["candidate_count"] == 1
    assert preview_body["updated_count"] == 0
    assert preview_body["movements"][0] == {
        "transaction_id": transaction_id,
        "external_id": "mp-old-1",
        "current_description": "Mercado Pago - SETTLEMENT | source mp-old-1",
        "suggested_description": "Mercado Pago - Cafe Martinez",
    }

    assert apply_response.status_code == 200
    assert apply_response.json()["updated_count"] == 1
    assert second_preview_response.json()["candidate_count"] == 0


def test_mercado_pago_normalization_falls_back_to_clean_type_label(
    client,
    auth_headers,
    db_session: Session,
) -> None:
    csv_text = "\n".join(
        [
            "SOURCE_ID;EXTERNAL_REFERENCE;TRANSACTION_TYPE;TRANSACTION_AMOUNT;TRANSACTION_CURRENCY;TRANSACTION_DATE;SETTLEMENT_NET_AMOUNT",
            "mp-fallback-income;;SETTLEMENT;2500.00;ARS;2026-08-18T13:00:00.000-03:00;2500.00",
            "mp-fallback-expense;;SETTLEMENT;-1800.00;ARS;2026-08-18T14:00:00.000-03:00;-1800.00",
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

    provider = FakeMercadoPagoProvider(csv_text)

    def override_service() -> MercadoPagoService:
        return MercadoPagoService(db_session, provider=provider)

    app.dependency_overrides[get_mercado_pago_service] = override_service
    try:
        import_response = client.post("/mercado-pago/import", headers=auth_headers, json={})
        preview_response = client.post("/mercado-pago/normalize-preview", headers=auth_headers, json={})
        apply_response = client.post("/mercado-pago/normalize", headers=auth_headers, json={})
    finally:
        app.dependency_overrides.pop(get_mercado_pago_service, None)

    assert import_response.status_code == 200
    assert preview_response.status_code == 200
    preview_body = preview_response.json()
    assert preview_body["candidate_count"] == 2
    assert [item["suggested_description"] for item in preview_body["movements"]] == [
        "Mercado Pago - Ingreso",
        "Mercado Pago - Gasto",
    ]
    assert apply_response.status_code == 200
    assert apply_response.json()["updated_count"] == 2


def test_mercado_pago_import_uses_payment_detail_when_report_has_no_human_name(
    client,
    auth_headers,
    db_session: Session,
) -> None:
    csv_text = "\n".join(
        [
            "SOURCE_ID;EXTERNAL_REFERENCE;TRANSACTION_TYPE;TRANSACTION_AMOUNT;TRANSACTION_CURRENCY;TRANSACTION_DATE;SETTLEMENT_NET_AMOUNT",
            "1748477427139;;SETTLEMENT;2114.00;ARS;2026-08-18T13:00:00.000-03:00;2114.00",
            "174286444638;;SETTLEMENT;-60426.00;ARS;2026-08-17T13:00:00.000-03:00;-60426.00",
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

    provider = FakeMercadoPagoProvider(
        csv_text,
        payment_details={
            "1748477427139": {"payer": {"first_name": "Juan", "last_name": "Perez"}},
            "174286444638": {"description": "Verduleria San Martin"},
        },
    )

    def override_service() -> MercadoPagoService:
        return MercadoPagoService(db_session, provider=provider)

    app.dependency_overrides[get_mercado_pago_service] = override_service
    try:
        response = client.post("/mercado-pago/import", headers=auth_headers, json={})
    finally:
        app.dependency_overrides.pop(get_mercado_pago_service, None)

    assert response.status_code == 200
    movements = response.json()["movements"]
    assert movements[0]["description"] == "Mercado Pago - Juan Perez"
    assert movements[1]["description"] == "Mercado Pago - Verduleria San Martin"


def test_mercado_pago_normalization_uses_payment_detail_for_existing_movements(
    client,
    auth_headers,
    db_session: Session,
) -> None:
    old_csv = "\n".join(
        [
            "SOURCE_ID;EXTERNAL_REFERENCE;TRANSACTION_TYPE;TRANSACTION_AMOUNT;TRANSACTION_CURRENCY;TRANSACTION_DATE;SETTLEMENT_NET_AMOUNT",
            "1748477427139;;SETTLEMENT;2114.00;ARS;2026-08-18T13:00:00.000-03:00;2114.00",
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

    provider = FakeMercadoPagoProvider(old_csv)

    def override_service() -> MercadoPagoService:
        return MercadoPagoService(db_session, provider=provider)

    app.dependency_overrides[get_mercado_pago_service] = override_service
    try:
        import_response = client.post("/mercado-pago/import", headers=auth_headers, json={})
        provider.payment_details = {"1748477427139": {"payer": {"first_name": "Juan", "last_name": "Perez"}}}
        preview_response = client.post("/mercado-pago/normalize-preview", headers=auth_headers, json={})
    finally:
        app.dependency_overrides.pop(get_mercado_pago_service, None)

    assert import_response.status_code == 200
    assert import_response.json()["movements"][0]["description"] == (
        "Mercado Pago - SETTLEMENT | source 1748477427139"
    )
    assert preview_response.status_code == 200
    assert preview_response.json()["candidate_count"] == 1
    assert preview_response.json()["movements"][0]["suggested_description"] == "Mercado Pago - Juan Perez"


def test_mercado_pago_normalization_upgrades_generic_fallback_with_payment_detail(
    client,
    auth_headers,
    db_session: Session,
) -> None:
    csv_text = "\n".join(
        [
            "SOURCE_ID;EXTERNAL_REFERENCE;TRANSACTION_TYPE;TRANSACTION_AMOUNT;TRANSACTION_CURRENCY;TRANSACTION_DATE;SETTLEMENT_NET_AMOUNT",
            "1748477427139;;SETTLEMENT;2114.00;ARS;2026-08-18T13:00:00.000-03:00;2114.00",
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

    provider = FakeMercadoPagoProvider(csv_text)

    def override_service() -> MercadoPagoService:
        return MercadoPagoService(db_session, provider=provider)

    app.dependency_overrides[get_mercado_pago_service] = override_service
    try:
        import_response = client.post("/mercado-pago/import", headers=auth_headers, json={})
        fallback_response = client.post("/mercado-pago/normalize", headers=auth_headers, json={})
        provider.payment_details = {"1748477427139": {"payer": {"first_name": "Juan", "last_name": "Perez"}}}
        preview_response = client.post("/mercado-pago/normalize-preview", headers=auth_headers, json={})
    finally:
        app.dependency_overrides.pop(get_mercado_pago_service, None)

    assert import_response.status_code == 200
    assert fallback_response.status_code == 200
    assert fallback_response.json()["movements"][0]["suggested_description"] == "Mercado Pago - Ingreso"
    assert preview_response.status_code == 200
    assert preview_response.json()["candidate_count"] == 1
    assert preview_response.json()["movements"][0]["current_description"] == "Mercado Pago - Ingreso"
    assert preview_response.json()["movements"][0]["suggested_description"] == "Mercado Pago - Juan Perez"


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


def test_mercado_pago_sync_requests_fresh_report_when_matching_report_is_stale(
    client,
    auth_headers,
    db_session: Session,
) -> None:
    today = date.today()
    stale_created_at = today - timedelta(days=1)
    reports = [
        {
            "id": 1,
            "file_name": "settlement-report-stale.csv",
            "begin_date": f"{today.isoformat()}T00:00:00Z",
            "end_date": f"{today.isoformat()}T23:59:59Z",
            "created_from": "manual",
            "date_created": f"{stale_created_at.isoformat()}T10:00:00Z",
        }
    ]

    client.patch(
        "/mercado-pago/integration",
        headers=auth_headers,
        json={"enabled": True, "access_token": "APP_USR-1234567890abcdef"},
    )
    from app.routers.mercado_pago import get_mercado_pago_service
    from app.services.mercado_pago import MercadoPagoService
    from app.main import app

    fake_provider = FakeMercadoPagoProvider("", reports=reports)

    def override_service() -> MercadoPagoService:
        return MercadoPagoService(db_session, provider=fake_provider)

    app.dependency_overrides[get_mercado_pago_service] = override_service
    try:
        response = client.post(
            "/mercado-pago/sync",
            headers=auth_headers,
            json={"begin_date": today.isoformat(), "end_date": today.isoformat()},
        )
    finally:
        app.dependency_overrides.pop(get_mercado_pago_service, None)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending"
    assert body["report_requested"] is True
    assert body["import_result"] is None
    assert fake_provider.requested_reports == [(today, today)]


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
