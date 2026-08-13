from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select

from app.main import app
from app.models.user import User
from app.repositories.ai_reports import AiReportRepository
from app.repositories.binance import BinanceRepository
from app.repositories.budgets import BudgetRepository
from app.repositories.categories import CategoryRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.saving_goals import SavingGoalRepository
from app.repositories.transactions import TransactionRepository
from app.routers.notifications import get_notification_service
from app.services.binance import BinanceService
from app.services.notifications import NotificationService


class FakeBinancePriceClient:
    def ticker_price(self, symbol: str) -> Decimal:
        prices = {
            "BTCUSDT": Decimal("60000"),
        }
        if symbol not in prices:
            raise ValueError("missing fake price")
        return prices[symbol]


def test_generate_basic_notifications_is_idempotent(client, auth_headers) -> None:
    category_response = client.post(
        "/categories",
        headers=auth_headers,
        json={"name": "Comida", "type": "expense", "color": "#f97316", "icon": "utensils"},
    )
    category_id = category_response.json()["id"]
    client.post(
        "/budgets",
        headers=auth_headers,
        json={
            "category_id": category_id,
            "year": 2026,
            "month": 8,
            "limit_amount": "100000.00",
            "alert_threshold_percentage": 80,
        },
    )
    client.post(
        "/transactions",
        headers=auth_headers,
        json={
            "category_id": category_id,
            "type": "expense",
            "amount": "120000.00",
            "currency": "ARS",
            "description": "Supermercado",
            "transaction_date": "2026-08-11",
        },
    )
    client.post(
        "/goals",
        headers=auth_headers,
        json={
            "name": "Fondo de emergencia",
            "target_amount": "1000000.00",
            "current_amount": "100000.00",
            "status": "active",
        },
    )

    first_response = client.post("/notifications/generate?year=2026&month=8", headers=auth_headers)
    second_response = client.post("/notifications/generate?year=2026&month=8", headers=auth_headers)
    list_response = client.get("/notifications", headers=auth_headers)

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert first_response.json()["generated_count"] == 3
    assert second_response.json()["generated_count"] == 0
    assert [item["type"] for item in list_response.json()] == [
        "goal_without_contribution",
        "ai_report_pending",
        "budget_exceeded",
    ]


def test_notifications_can_be_marked_as_read(client, auth_headers) -> None:
    client.post("/notifications/generate?year=2026&month=8", headers=auth_headers)
    notifications = client.get("/notifications", headers=auth_headers).json()
    notification_id = notifications[0]["id"]

    read_response = client.patch(f"/notifications/{notification_id}/read", headers=auth_headers)
    unread_response = client.get("/notifications?unread_only=true", headers=auth_headers)
    read_all_response = client.patch("/notifications/read-all", headers=auth_headers)

    assert read_response.status_code == 200
    assert read_response.json()["is_read"] is True
    assert unread_response.status_code == 200
    assert unread_response.json() == []
    assert read_all_response.status_code == 200
    assert read_all_response.json()["updated_count"] == 0


def test_generate_basic_notifications_includes_important_binance_alerts(client, db_session, auth_headers) -> None:
    user = db_session.scalar(select(User).where(User.email == "user@example.com"))
    assert user is not None
    BinanceRepository(db_session).create_balance_snapshots(
        user_id=user.id,
        balances=[
            ("BTC", Decimal("0.0100000000"), Decimal("0"), Decimal("0.0100000000")),
            ("USDT", Decimal("25.0000000000"), Decimal("0"), Decimal("25.0000000000")),
        ],
        fetched_at=datetime(2026, 8, 11, 12, 0, tzinfo=timezone.utc),
    )

    def override_service() -> NotificationService:
        return NotificationService(
            NotificationRepository(db_session),
            BudgetRepository(db_session),
            CategoryRepository(db_session),
            TransactionRepository(db_session),
            SavingGoalRepository(db_session),
            AiReportRepository(db_session),
            BinanceService(db_session, BinanceRepository(db_session), FakeBinancePriceClient()),
        )

    app.dependency_overrides[get_notification_service] = override_service
    try:
        first_response = client.post("/notifications/generate?year=2026&month=8", headers=auth_headers)
        second_response = client.post("/notifications/generate?year=2026&month=8", headers=auth_headers)
        list_response = client.get("/notifications", headers=auth_headers)
    finally:
        app.dependency_overrides.pop(get_notification_service, None)

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert first_response.json()["generated_count"] == 2
    assert second_response.json()["generated_count"] == 0
    notifications = list_response.json()
    assert {item["type"] for item in notifications} == {"ai_report_pending", "binance_portfolio_alert"}
    binance_notification = next(item for item in notifications if item["type"] == "binance_portfolio_alert")
    assert binance_notification["priority"] == "high"
    assert binance_notification["action_section"] == "investments"
