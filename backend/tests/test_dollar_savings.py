from fastapi.testclient import TestClient


def test_dollar_saving_lifecycle(client: TestClient, auth_headers: dict[str, str]) -> None:
    create_response = client.post(
        "/dollar-savings",
        headers=auth_headers,
        json={
            "amount": "250.00",
            "source": "mercado_pago",
            "notes": "Compra inicial",
            "saved_at": "2026-07-08",
        },
    )

    assert create_response.status_code == 201
    dollar_saving = create_response.json()
    assert dollar_saving["amount"] == "250.00"
    assert dollar_saving["source"] == "mercado_pago"
    assert dollar_saving["notes"] == "Compra inicial"

    update_response = client.patch(
        f"/dollar-savings/{dollar_saving['id']}",
        headers=auth_headers,
        json={"amount": "275.00", "source": "bank"},
    )

    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["amount"] == "275.00"
    assert updated["source"] == "bank"

    list_response = client.get("/dollar-savings", headers=auth_headers)

    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    delete_response = client.delete(f"/dollar-savings/{dollar_saving['id']}", headers=auth_headers)

    assert delete_response.status_code == 204
    assert client.get("/dollar-savings", headers=auth_headers).json() == []
