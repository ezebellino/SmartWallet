from fastapi.testclient import TestClient


def test_register_login_and_get_current_user(client: TestClient) -> None:
    register_response = client.post(
        "/auth/register",
        json={
            "email": "new-user@example.com",
            "password": "strong-password",
            "full_name": "New User",
        },
    )

    assert register_response.status_code == 201
    register_body = register_response.json()
    assert register_body["user"]["email"] == "new-user@example.com"
    assert register_body["token"]["token_type"] == "bearer"

    login_response = client.post(
        "/auth/login",
        json={"email": "new-user@example.com", "password": "strong-password"},
    )

    assert login_response.status_code == 200
    token = login_response.json()["token"]["access_token"]

    me_response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert me_response.status_code == 200
    assert me_response.json()["email"] == "new-user@example.com"


def test_register_rejects_duplicate_email(client: TestClient) -> None:
    payload = {
        "email": "duplicate@example.com",
        "password": "strong-password",
        "full_name": "Duplicate User",
    }

    assert client.post("/auth/register", json=payload).status_code == 201
    response = client.post("/auth/register", json=payload)

    assert response.status_code == 409

