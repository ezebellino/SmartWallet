from fastapi.testclient import TestClient


def _create_expense_category(client: TestClient, auth_headers: dict[str, str], name: str) -> int:
    response = client.post(
        "/categories",
        headers=auth_headers,
        json={"name": name, "type": "expense", "color": "#ef4444", "icon": "tag"},
    )
    assert response.status_code == 201
    return response.json()["id"]


def _create_expense(
    client: TestClient,
    auth_headers: dict[str, str],
    category_id: int,
    amount: str,
) -> None:
    response = client.post(
        "/transactions",
        headers=auth_headers,
        json={
            "category_id": category_id,
            "type": "expense",
            "amount": amount,
            "currency": "ARS",
            "description": "Expense",
            "transaction_date": "2026-07-10",
        },
    )
    assert response.status_code == 201


def test_budget_usage_and_spending_insights(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    food_id = _create_expense_category(client, auth_headers, "Food")
    transport_id = _create_expense_category(client, auth_headers, "Transport")

    budget_response = client.post(
        "/budgets",
        headers=auth_headers,
        json={
            "category_id": food_id,
            "year": 2026,
            "month": 7,
            "limit_amount": "500.00",
            "alert_threshold_percentage": 80,
        },
    )

    assert budget_response.status_code == 201

    _create_expense(client, auth_headers, food_id, "600.00")
    _create_expense(client, auth_headers, transport_id, "100.00")

    usage_response = client.get("/budgets/usage?year=2026&month=7", headers=auth_headers)

    assert usage_response.status_code == 200
    usage = usage_response.json()[0]
    assert usage["spent_amount"] == "600.00"
    assert usage["remaining_amount"] == "0"
    assert usage["usage_percentage"] == 120.0
    assert usage["is_over_budget"] is True
    assert usage["is_near_limit"] is True

    insights_response = client.get("/insights/spending?year=2026&month=7", headers=auth_headers)

    assert insights_response.status_code == 200
    insights = insights_response.json()["insights"]
    insight_types = {insight["type"] for insight in insights}
    assert "budget_exceeded" in insight_types
    assert "category_concentration" in insight_types


def test_budget_rejects_income_category(client: TestClient, auth_headers: dict[str, str]) -> None:
    category_response = client.post(
        "/categories",
        headers=auth_headers,
        json={"name": "Salary", "type": "income", "color": "#22c55e", "icon": "briefcase"},
    )
    category_id = category_response.json()["id"]

    response = client.post(
        "/budgets",
        headers=auth_headers,
        json={
            "category_id": category_id,
            "year": 2026,
            "month": 7,
            "limit_amount": "500.00",
        },
    )

    assert response.status_code == 400

