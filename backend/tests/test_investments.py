from fastapi.testclient import TestClient


def test_investment_asset_operations_and_portfolio(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    asset_response = client.post(
        "/investments/assets",
        headers=auth_headers,
        json={
            "name": "Bitcoin",
            "symbol": "btc",
            "asset_type": "crypto",
            "currency": "usd",
            "risk_level": "high",
            "current_price": "50000.0000",
        },
    )

    assert asset_response.status_code == 201
    asset = asset_response.json()
    assert asset["symbol"] == "BTC"
    assert asset["currency"] == "USD"

    buy_response = client.post(
        "/investments/operations",
        headers=auth_headers,
        json={
            "asset_id": asset["id"],
            "operation_type": "buy",
            "quantity": "0.10000000",
            "unit_price": "40000.0000",
            "fees": "10.00",
            "operation_date": "2026-07-01",
        },
    )
    sell_response = client.post(
        "/investments/operations",
        headers=auth_headers,
        json={
            "asset_id": asset["id"],
            "operation_type": "sell",
            "quantity": "0.02000000",
            "unit_price": "45000.0000",
            "fees": "5.00",
            "operation_date": "2026-07-02",
        },
    )

    assert buy_response.status_code == 201
    assert sell_response.status_code == 201

    invalid_sell_response = client.post(
        "/investments/operations",
        headers=auth_headers,
        json={
            "asset_id": asset["id"],
            "operation_type": "sell",
            "quantity": "1.00000000",
            "unit_price": "45000.0000",
            "fees": "0.00",
            "operation_date": "2026-07-03",
        },
    )

    assert invalid_sell_response.status_code == 400

    portfolio_response = client.get("/investments/portfolio", headers=auth_headers)

    assert portfolio_response.status_code == 200
    portfolio = portfolio_response.json()
    assert portfolio["total_invested"] == "3115.00"
    assert portfolio["total_estimated_value"] == "4000.00"
    assert portfolio["total_unrealized_gain_loss"] == "885.00"
    assert portfolio["positions"][0]["quantity"] == "0.08000000"
    assert portfolio["positions"][0]["average_cost"] == "38937.50"
    assert "does not constitute professional financial advice" in portfolio["risk_warning"]


def test_investment_routes_require_auth(client: TestClient) -> None:
    response = client.get("/investments/assets")

    assert response.status_code == 401

