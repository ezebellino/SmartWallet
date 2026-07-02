from fastapi.testclient import TestClient


def test_saving_goal_lifecycle(client: TestClient, auth_headers: dict[str, str]) -> None:
    create_response = client.post(
        "/goals",
        headers=auth_headers,
        json={
            "name": "Emergency fund",
            "target_amount": "1000.00",
            "current_amount": "100.00",
            "target_date": "2026-12-31",
        },
    )

    assert create_response.status_code == 201
    goal = create_response.json()
    assert goal["name"] == "Emergency fund"
    assert goal["progress_percentage"] == 10.0
    assert goal["remaining_amount"] == "900.00"

    contribution_response = client.post(
        f"/goals/{goal['id']}/contributions",
        headers=auth_headers,
        json={"amount": "900.00"},
    )

    assert contribution_response.status_code == 200
    completed_goal = contribution_response.json()
    assert completed_goal["current_amount"] == "1000.00"
    assert completed_goal["status"] == "completed"
    assert completed_goal["progress_percentage"] == 100.0

    list_response = client.get("/goals", headers=auth_headers)

    assert list_response.status_code == 200
    assert len(list_response.json()) == 1


def test_saving_goal_rejects_current_amount_above_target(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.post(
        "/goals",
        headers=auth_headers,
        json={
            "name": "Invalid goal",
            "target_amount": "100.00",
            "current_amount": "200.00",
        },
    )

    assert response.status_code == 400


def test_compound_interest_simulation(client: TestClient) -> None:
    response = client.post(
        "/simulations/compound-interest",
        json={
            "initial_amount": "1000.00",
            "monthly_contribution": "100.00",
            "annual_interest_rate": "12.00",
            "years": 1,
        },
    )

    assert response.status_code == 200
    simulation = response.json()
    assert simulation["final_balance"] == "2407.76"
    assert simulation["total_contributions"] == "2200.00"
    assert simulation["total_interest"] == "207.76"
    assert len(simulation["points"]) == 12
