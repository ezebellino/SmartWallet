import calendar
from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status

from app.models.notification import Notification, NotificationPriority, NotificationType
from app.models.saving_goal import SavingGoalStatus
from app.repositories.ai_reports import AiReportRepository
from app.repositories.binance import BinanceRepository
from app.repositories.budgets import BudgetRepository
from app.repositories.categories import CategoryRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.saving_goals import SavingGoalRepository
from app.repositories.transactions import TransactionRepository
from app.services.binance import BinanceService
from app.schemas.notification import NotificationGenerateResponse
from app.services.budgets import BudgetService


class NotificationService:
    def __init__(
        self,
        notifications: NotificationRepository,
        budgets: BudgetRepository,
        categories: CategoryRepository,
        transactions: TransactionRepository,
        saving_goals: SavingGoalRepository,
        ai_reports: AiReportRepository,
        binance_service: BinanceService | None = None,
    ) -> None:
        self.notifications = notifications
        self.budgets = budgets
        self.categories = categories
        self.transactions = transactions
        self.saving_goals = saving_goals
        self.ai_reports = ai_reports
        self.binance_service = binance_service

    def list_notifications(self, *, user_id: int, unread_only: bool, limit: int) -> list[Notification]:
        return self.notifications.list_by_user(user_id=user_id, unread_only=unread_only, limit=limit)

    def mark_read(self, *, notification_id: int, user_id: int) -> Notification:
        notification = self.notifications.get_by_id(notification_id=notification_id, user_id=user_id)
        if not notification:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        return self.notifications.mark_read(notification)

    def mark_all_read(self, *, user_id: int) -> dict[str, int]:
        return {"updated_count": self.notifications.mark_all_read(user_id=user_id)}

    def generate_basic(self, *, user_id: int, year: int, month: int) -> NotificationGenerateResponse:
        candidates = [
            *self._budget_notifications(user_id=user_id, year=year, month=month),
            *self._ai_report_notifications(user_id=user_id, year=year, month=month),
            *self._goal_notifications(user_id=user_id, year=year, month=month),
            *self._binance_notifications(user_id=user_id, year=year, month=month),
        ]
        created = self.notifications.create_many_skip_duplicates(candidates)
        return NotificationGenerateResponse(generated_count=len(created), notifications=created)

    def generate_binance_alerts(self, *, user_id: int, year: int, month: int) -> NotificationGenerateResponse:
        candidates = self._binance_notifications(user_id=user_id, year=year, month=month)
        created = self.notifications.create_many_skip_duplicates(candidates)
        return NotificationGenerateResponse(generated_count=len(created), notifications=created)

    def _budget_notifications(self, *, user_id: int, year: int, month: int) -> list[Notification]:
        budget_service = BudgetService(self.budgets, self.categories, self.transactions)
        usage_items = budget_service.get_budget_usage(user_id=user_id, year=year, month=month)
        notifications: list[Notification] = []
        for usage in usage_items:
            spent = Decimal(usage.spent_amount)
            limit = Decimal(usage.limit_amount)
            if usage.is_over_budget:
                notifications.append(
                    self._build(
                        user_id=user_id,
                        notification_type=NotificationType.budget_exceeded,
                        priority=NotificationPriority.high,
                        title=f"Presupuesto excedido: {usage.category_name}",
                        message=f"Gastaste {spent} de un limite mensual de {limit}.",
                        action_label="Ver presupuesto",
                        action_section="budgets",
                        dedupe_key=f"budget-exceeded:{year}:{month}:{usage.budget_id}",
                        year=year,
                        month=month,
                    )
                )
            elif usage.is_near_limit:
                notifications.append(
                    self._build(
                        user_id=user_id,
                        notification_type=NotificationType.budget_near_limit,
                        priority=NotificationPriority.medium,
                        title=f"Presupuesto cerca del limite: {usage.category_name}",
                        message=f"Ya usaste {usage.usage_percentage:.0f}% del presupuesto mensual.",
                        action_label="Revisar limite",
                        action_section="budgets",
                        dedupe_key=f"budget-near:{year}:{month}:{usage.budget_id}",
                        year=year,
                        month=month,
                    )
                )
        return notifications

    def _ai_report_notifications(self, *, user_id: int, year: int, month: int) -> list[Notification]:
        if self.ai_reports.get_by_period(user_id=user_id, year=year, month=month):
            return []
        return [
            self._build(
                user_id=user_id,
                notification_type=NotificationType.ai_report_pending,
                priority=NotificationPriority.low,
                title="Reporte IA pendiente",
                message="Todavia no generaste el reporte IA de este periodo.",
                action_label="Generar reporte",
                action_section="aiReports",
                dedupe_key=f"ai-report-pending:{year}:{month}",
                year=year,
                month=month,
            )
        ]

    def _goal_notifications(self, *, user_id: int, year: int, month: int) -> list[Notification]:
        start_date = date(year, month, 1)
        end_date = date(year, month, calendar.monthrange(year, month)[1])
        goals = [
            goal
            for goal in self.saving_goals.list_by_user(user_id)
            if goal.status == SavingGoalStatus.active and goal.current_amount < goal.target_amount
        ]
        transactions = self.transactions.list_by_user(user_id=user_id, start_date=start_date, end_date=end_date)
        has_saving_movement = any(
            (transaction.description or "").lower().find("ahorro") >= 0 for transaction in transactions
        )
        if has_saving_movement or not goals:
            return []
        return [
            self._build(
                user_id=user_id,
                notification_type=NotificationType.goal_without_contribution,
                priority=NotificationPriority.low,
                title="Objetivo sin aportes este mes",
                message="Tenes objetivos activos, pero no detectamos movimientos de ahorro en el periodo.",
                action_label="Ver objetivos",
                action_section="goals",
                dedupe_key=f"goal-without-contribution:{year}:{month}",
                year=year,
                month=month,
            )
        ]

    def _binance_notifications(self, *, user_id: int, year: int, month: int) -> list[Notification]:
        binance_service = self.binance_service
        if binance_service is None:
            binance_service = BinanceService(self.notifications.db, BinanceRepository(self.notifications.db))

        summary = binance_service.get_portfolio_summary(user_id)
        notifications: list[Notification] = []
        for alert in summary.alerts:
            if alert.severity not in {"high", "medium"}:
                continue

            priority = (
                NotificationPriority.high
                if alert.severity == "high"
                else NotificationPriority.medium
            )
            notifications.append(
                self._build(
                    user_id=user_id,
                    notification_type=NotificationType.binance_portfolio_alert,
                    priority=priority,
                    title=alert.title,
                    message=alert.message,
                    action_label="Ver Binance",
                    action_section="investments",
                    dedupe_key=f"binance-alert:{year}:{month}:{alert.type}:{alert.asset or 'portfolio'}",
                    year=year,
                    month=month,
                )
            )
        return notifications

    def _build(
        self,
        *,
        user_id: int,
        notification_type: NotificationType,
        priority: NotificationPriority,
        title: str,
        message: str,
        action_label: str,
        action_section: str,
        dedupe_key: str,
        year: int,
        month: int,
    ) -> Notification:
        return Notification(
            user_id=user_id,
            type=notification_type,
            priority=priority,
            title=title,
            message=message,
            action_label=action_label,
            action_section=action_section,
            dedupe_key=dedupe_key,
            period_year=year,
            period_month=month,
        )
