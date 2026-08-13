def test_accounts_and_internal_transfers_do_not_duplicate_income(client, auth_headers) -> None:
    bank_response = client.post(
        "/accounts",
        headers=auth_headers,
        json={
            "name": "Banco Provincia",
            "type": "bank",
            "currency": "ARS",
            "institution": "Banco Provincia",
            "initial_balance": "0",
            "color": "#38bdf8",
            "icon": "landmark",
        },
    )
    wallet_response = client.post(
        "/accounts",
        headers=auth_headers,
        json={
            "name": "Mercado Pago",
            "type": "wallet",
            "currency": "ARS",
            "institution": "Mercado Pago",
            "initial_balance": "0",
            "color": "#00b1ea",
            "icon": "wallet",
        },
    )
    category_response = client.post(
        "/categories",
        headers=auth_headers,
        json={"name": "Sueldo", "type": "income", "color": "#16f2a4", "icon": "arrow-up"},
    )

    assert bank_response.status_code == 201
    assert wallet_response.status_code == 201
    assert category_response.status_code == 201

    bank = bank_response.json()
    wallet = wallet_response.json()
    category = category_response.json()

    transaction_response = client.post(
        "/transactions",
        headers=auth_headers,
        json={
            "account_id": bank["id"],
            "category_id": category["id"],
            "type": "income",
            "amount": "1000000.00",
            "currency": "ARS",
            "description": "Sueldo mensual",
            "transaction_date": "2026-08-05",
        },
    )
    transfer_response = client.post(
        "/accounts/transfers",
        headers=auth_headers,
        json={
            "from_account_id": bank["id"],
            "to_account_id": wallet["id"],
            "amount": "1000000.00",
            "currency": "ARS",
            "description": "Paso sueldo completo a Mercado Pago",
            "transfer_date": "2026-08-05",
        },
    )
    summary_response = client.get("/dashboard/monthly-summary?year=2026&month=8", headers=auth_headers)

    assert transaction_response.status_code == 201
    assert transfer_response.status_code == 201
    assert summary_response.status_code == 200
    assert float(summary_response.json()["total_income"]) == 1000000.00
    assert float(summary_response.json()["total_expense"]) == 0.00


def test_transfer_requires_distinct_owned_accounts(client, auth_headers) -> None:
    account_response = client.post(
        "/accounts",
        headers=auth_headers,
        json={
            "name": "Mercado Pago",
            "type": "wallet",
            "currency": "ARS",
            "initial_balance": "0",
            "color": "#00b1ea",
            "icon": "wallet",
        },
    )

    account_id = account_response.json()["id"]
    response = client.post(
        "/accounts/transfers",
        headers=auth_headers,
        json={
            "from_account_id": account_id,
            "to_account_id": account_id,
            "amount": "1000.00",
            "currency": "ARS",
            "transfer_date": "2026-08-05",
        },
    )

    assert response.status_code == 422


def test_transaction_description_can_be_updated_without_account_payload(client, auth_headers) -> None:
    account_response = client.post(
        "/accounts",
        headers=auth_headers,
        json={
            "name": "Banco Provincia",
            "type": "bank",
            "currency": "ARS",
            "institution": "Banco Provincia",
            "initial_balance": "0",
            "color": "#38bdf8",
            "icon": "landmark",
        },
    )
    category_response = client.post(
        "/categories",
        headers=auth_headers,
        json={"name": "Sueldo", "type": "income", "color": "#16f2a4", "icon": "arrow-up"},
    )
    transaction_response = client.post(
        "/transactions",
        headers=auth_headers,
        json={
            "account_id": account_response.json()["id"],
            "category_id": category_response.json()["id"],
            "type": "income",
            "amount": "3001549.00",
            "currency": "ARS",
            "description": "Sueldo",
            "transaction_date": "2026-07-31",
        },
    )

    response = client.patch(
        f"/transactions/{transaction_response.json()['id']}",
        headers=auth_headers,
        json={
            "category_id": category_response.json()["id"],
            "amount": "3001549.00",
            "currency": "ARS",
            "description": "Sueldo Banco Provincia AUBASA",
            "transaction_date": "2026-07-31",
        },
    )

    assert response.status_code == 200
    assert response.json()["description"] == "Sueldo Banco Provincia AUBASA"
