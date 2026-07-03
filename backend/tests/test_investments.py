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
    assert asset["price_source"] == "manual"
    assert asset["price_updated_at"] is not None

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


def test_investment_alerts_report_missing_prices_and_high_risk_concentration(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    missing_price_response = client.post(
        "/investments/assets",
        headers=auth_headers,
        json={
            "name": "Unpriced Asset",
            "symbol": "MISS",
            "asset_type": "stock",
            "currency": "USD",
            "risk_level": "medium",
            "current_price": None,
        },
    )
    high_risk_response = client.post(
        "/investments/assets",
        headers=auth_headers,
        json={
            "name": "High Risk Coin",
            "symbol": "HRC",
            "asset_type": "crypto",
            "currency": "USD",
            "risk_level": "high",
            "current_price": "100.0000",
        },
    )
    low_risk_response = client.post(
        "/investments/assets",
        headers=auth_headers,
        json={
            "name": "Low Risk Bond",
            "symbol": "LRB",
            "asset_type": "bond",
            "currency": "USD",
            "risk_level": "low",
            "current_price": "100.0000",
        },
    )

    high_risk_asset = high_risk_response.json()
    low_risk_asset = low_risk_response.json()
    client.post(
        "/investments/operations",
        headers=auth_headers,
        json={
            "asset_id": high_risk_asset["id"],
            "operation_type": "buy",
            "quantity": "10.00000000",
            "unit_price": "100.0000",
            "fees": "0.00",
            "operation_date": "2026-07-01",
        },
    )
    client.post(
        "/investments/operations",
        headers=auth_headers,
        json={
            "asset_id": low_risk_asset["id"],
            "operation_type": "buy",
            "quantity": "1.00000000",
            "unit_price": "100.0000",
            "fees": "0.00",
            "operation_date": "2026-07-01",
        },
    )

    alerts_response = client.get("/investments/alerts", headers=auth_headers)

    assert missing_price_response.status_code == 201
    assert alerts_response.status_code == 200
    alert_types = {alert["type"] for alert in alerts_response.json()["alerts"]}
    assert "missing_price" in alert_types
    assert "high_risk_concentration" in alert_types


def test_investment_routes_require_auth(client: TestClient) -> None:
    response = client.get("/investments/assets")

    assert response.status_code == 401

    alerts_response = client.get("/investments/alerts")

    assert alerts_response.status_code == 401
