import json

from fastapi.testclient import TestClient

from app.core.config import settings


class FakeOpenAIResponse:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self.payload


def test_generate_monthly_ai_report_stub(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    income_category = client.post(
        "/categories",
        headers=auth_headers,
        json={"name": "Salary", "type": "income", "color": "#22c55e", "icon": "briefcase"},
    ).json()
    expense_category = client.post(
        "/categories",
        headers=auth_headers,
        json={"name": "Food", "type": "expense", "color": "#ef4444", "icon": "utensils"},
    ).json()

    client.post(
        "/budgets",
        headers=auth_headers,
        json={
            "category_id": expense_category["id"],
            "year": 2026,
            "month": 7,
            "limit_amount": "500.00",
        },
    )
    client.post(
        "/transactions",
        headers=auth_headers,
        json={
            "category_id": income_category["id"],
            "type": "income",
            "amount": "1000.00",
            "currency": "ARS",
            "description": "Salary",
            "transaction_date": "2026-07-01",
        },
    )
    client.post(
        "/transactions",
        headers=auth_headers,
        json={
            "category_id": expense_category["id"],
            "type": "expense",
            "amount": "650.00",
            "currency": "ARS",
            "description": "Food",
            "transaction_date": "2026-07-02",
        },
    )

    response = client.post(
        "/ai/monthly-report",
        headers=auth_headers,
        json={"year": 2026, "month": 7},
    )

    assert response.status_code == 201
    report = response.json()
    assert report["provider"] == "stub"
    assert report["prompt_version"] == "monthly-report-v1"
    assert "Reporte mensual para 07/2026" in report["summary"]
    assert "Los ingresos fueron 1000.00" in report["summary"]
    assert "Senales detectadas" in report["recommendations"]
    assert "Food exceeded its monthly budget" in report["recommendations"]
    assert "asesoramiento financiero profesional" in report["risk_warnings"]

    second_response = client.post(
        "/ai/monthly-report",
        headers=auth_headers,
        json={"year": 2026, "month": 7},
    )

    assert second_response.status_code == 201
    assert second_response.json()["id"] == report["id"]

    list_response = client.get("/ai/reports", headers=auth_headers)

    assert list_response.status_code == 200
    assert len(list_response.json()) == 1


def test_ai_reports_require_auth(client: TestClient) -> None:
    response = client.get("/ai/reports")

    assert response.status_code == 401


def test_generate_monthly_ai_report_respects_english_language(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.post(
        "/ai/monthly-report",
        headers=auth_headers,
        json={"year": 2026, "month": 7, "language": "en"},
    )

    assert response.status_code == 201
    report = response.json()
    assert report["provider"] == "stub"
    assert "Monthly report for 07/2026" in report["summary"]
    assert "No alerts detected" in report["recommendations"]
    assert "not professional financial advice" in report["risk_warnings"]


def test_generate_monthly_ai_report_openai_provider(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch,
) -> None:
    monkeypatch.setattr(settings, "ai_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr(settings, "openai_model", "test-model")

    def fake_post(*args, **kwargs) -> FakeOpenAIResponse:
        assert kwargs["json"]["model"] == "test-model"
        system_prompt = kwargs["json"]["input"][0]["content"]
        assert "Spanish" in system_prompt
        return FakeOpenAIResponse(
            {
                "output_text": json.dumps(
                    {
                        "summary": "Resumen IA del mes.",
                        "recommendations": "Revisar gastos variables y definir una meta.",
                        "risk_warnings": "Contenido educativo, no asesoramiento financiero profesional.",
                    }
                )
            }
        )

    monkeypatch.setattr("app.ai.monthly_report_provider.httpx.post", fake_post)

    response = client.post(
        "/ai/monthly-report",
        headers=auth_headers,
        json={"year": 2026, "month": 8, "language": "es"},
    )

    assert response.status_code == 201
    report = response.json()
    assert report["provider"] == "openai"
    assert report["summary"] == "Resumen IA del mes."
    assert "meta" in report["recommendations"]


def test_generate_monthly_ai_report_falls_back_to_stub_when_openai_fails(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch,
) -> None:
    monkeypatch.setattr(settings, "ai_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "test-key")

    def fake_post(*args, **kwargs):
        raise RuntimeError("OpenAI unavailable")

    monkeypatch.setattr("app.ai.monthly_report_provider.httpx.post", fake_post)

    response = client.post(
        "/ai/monthly-report",
        headers=auth_headers,
        json={"year": 2026, "month": 9},
    )

    assert response.status_code == 201
    report = response.json()
    assert report["provider"] == "stub"
    assert "Reporte mensual para 09/2026" in report["summary"]
