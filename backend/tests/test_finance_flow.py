from fastapi.testclient import TestClient


def test_categories_transactions_and_dashboard_flow(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    salary_response = client.post(
        "/categories",
        headers=auth_headers,
        json={
            "name": "Salary",
            "type": "income",
            "color": "#22c55e",
            "icon": "briefcase",
        },
    )
    food_response = client.post(
        "/categories",
        headers=auth_headers,
        json={
            "name": "Food",
            "type": "expense",
            "color": "#f97316",
            "icon": "utensils",
        },
    )

    assert salary_response.status_code == 201
    assert food_response.status_code == 201
    salary_id = salary_response.json()["id"]
    food_id = food_response.json()["id"]

    categories_response = client.get("/categories", headers=auth_headers)

    assert categories_response.status_code == 200
    assert len(categories_response.json()) == 2

    income_response = client.post(
        "/transactions",
        headers=auth_headers,
        json={
            "category_id": salary_id,
            "type": "income",
            "amount": "1000.00",
            "currency": "ARS",
            "description": "Monthly salary",
            "transaction_date": "2026-07-01",
        },
    )
    expense_response = client.post(
        "/transactions",
        headers=auth_headers,
        json={
            "category_id": food_id,
            "type": "expense",
            "amount": "250.00",
            "currency": "ARS",
            "description": "Groceries",
            "transaction_date": "2026-07-02",
        },
    )

    assert income_response.status_code == 201
    assert expense_response.status_code == 201

    previous_income_response = client.post(
        "/transactions",
        headers=auth_headers,
        json={
            "category_id": salary_id,
            "type": "income",
            "amount": "800.00",
            "currency": "ARS",
            "description": "Previous salary",
            "transaction_date": "2026-06-01",
        },
    )
    previous_expense_response = client.post(
        "/transactions",
        headers=auth_headers,
        json={
            "category_id": food_id,
            "type": "expense",
            "amount": "300.00",
            "currency": "ARS",
            "description": "Previous groceries",
            "transaction_date": "2026-06-02",
        },
    )

    assert previous_income_response.status_code == 201
    assert previous_expense_response.status_code == 201

    invalid_response = client.post(
        "/transactions",
        headers=auth_headers,
        json={
            "category_id": food_id,
            "type": "income",
            "amount": "100.00",
            "currency": "ARS",
            "description": "Invalid type",
            "transaction_date": "2026-07-03",
        },
    )

    assert invalid_response.status_code == 400

    transactions_response = client.get("/transactions", headers=auth_headers)

    assert transactions_response.status_code == 200
    assert len(transactions_response.json()) == 4

    dashboard_response = client.get(
        "/dashboard/monthly-summary?year=2026&month=7",
        headers=auth_headers,
    )

    assert dashboard_response.status_code == 200
    dashboard = dashboard_response.json()
    assert dashboard["total_income"] == "1000.00"
    assert dashboard["total_expense"] == "250.00"
    assert dashboard["net_balance"] == "750.00"
    assert dashboard["savings_rate"] == 75.0
    assert dashboard["expense_by_category"][0]["category_name"] == "Food"

    comparison_response = client.get(
        "/dashboard/monthly-comparison?year=2026&month=7",
        headers=auth_headers,
    )

    assert comparison_response.status_code == 200
    comparison = comparison_response.json()
    assert comparison["previous_year"] == 2026
    assert comparison["previous_month"] == 6
    assert comparison["total_income"]["current"] == "1000.00"
    assert comparison["total_income"]["previous"] == "800.00"
    assert comparison["total_income"]["delta"] == "200.00"
    assert comparison["total_income"]["delta_percentage"] == 25.0
    assert comparison["total_expense"]["current"] == "250.00"
    assert comparison["total_expense"]["previous"] == "300.00"
    assert comparison["total_expense"]["delta"] == "-50.00"
    assert comparison["net_balance"]["current"] == "750.00"
    assert comparison["net_balance"]["previous"] == "500.00"
    assert comparison["savings_rate"]["current"] == 75.0
    assert comparison["savings_rate"]["previous"] == 62.5


def test_protected_routes_require_auth(client: TestClient) -> None:
    response = client.get("/categories")

    assert response.status_code == 401
