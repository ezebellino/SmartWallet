from fastapi.testclient import TestClient


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
    assert "Monthly report for 07/2026" in report["summary"]
    assert "Income was 1000.00" in report["summary"]
    assert "Detected signals" in report["recommendations"]
    assert "Food exceeded its monthly budget" in report["recommendations"]
    assert "not professional financial advice" in report["risk_warnings"]

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

