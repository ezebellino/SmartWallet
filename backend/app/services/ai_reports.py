import logging
from decimal import Decimal

from app.ai.monthly_report_provider import MonthlyReportProvider, StubMonthlyReportProvider
from app.models.ai_report import AiReport
from app.repositories.ai_reports import AiReportRepository
from app.repositories.dollar_savings import DollarSavingRepository
from app.repositories.saving_goals import SavingGoalRepository
from app.schemas.ai_report import AiReportContext
from app.schemas.dashboard import MonthlySummary
from app.schemas.insight import SpendingInsightsResponse
from app.services.budgets import BudgetService
from app.services.dashboard import DashboardService
from app.services.insights import InsightService
from app.services.investments import InvestmentService

logger = logging.getLogger(__name__)


class AiReportService:
    def __init__(
        self,
        reports: AiReportRepository,
        dashboard_service: DashboardService,
        insight_service: InsightService,
        budget_service: BudgetService,
        saving_goals: SavingGoalRepository,
        dollar_savings: DollarSavingRepository,
        investment_service: InvestmentService,
        provider: MonthlyReportProvider | None = None,
        fallback_provider: MonthlyReportProvider | None = None,
    ) -> None:
        self.reports = reports
        self.dashboard_service = dashboard_service
        self.insight_service = insight_service
        self.budget_service = budget_service
        self.saving_goals = saving_goals
        self.dollar_savings = dollar_savings
        self.investment_service = investment_service
        self.provider = provider or StubMonthlyReportProvider()
        self.fallback_provider = fallback_provider or StubMonthlyReportProvider()

    def list_reports(self, user_id: int) -> list[AiReport]:
        return self.reports.list_by_user(user_id)

    def generate_monthly_report(
        self,
        *,
        user_id: int,
        year: int,
        month: int,
        force_regenerate: bool,
        language: str = "es",
    ) -> AiReport:
        existing_report = self.reports.get_by_period(user_id=user_id, year=year, month=month)
        if existing_report and not force_regenerate:
            return existing_report

        dashboard = self.dashboard_service.get_monthly_summary(user_id=user_id, year=year, month=month)
        insights = self.insight_service.get_spending_insights(user_id=user_id, year=year, month=month)
        context = self._build_context(
            user_id=user_id,
            year=year,
            month=month,
            language=language,
            dashboard=dashboard,
            insights=insights,
        )
        try:
            draft = self.provider.generate(context)
        except Exception as error:
            logger.warning(
                "Monthly AI report provider '%s' failed; falling back to '%s': %s",
                self.provider.provider_name,
                self.fallback_provider.provider_name,
                error,
            )
            draft = self.fallback_provider.generate(context)

        if existing_report:
            return self.reports.update(existing_report, draft)
        return self.reports.create(user_id=user_id, year=year, month=month, draft=draft)

    def _build_context(
        self,
        *,
        user_id: int,
        year: int,
        month: int,
        language: str,
        dashboard: MonthlySummary,
        insights: SpendingInsightsResponse,
    ) -> AiReportContext:
        budget_usage = self.budget_service.get_budget_usage(user_id=user_id, year=year, month=month)
        goals = self.saving_goals.list_by_user(user_id)
        dollar_savings = self.dollar_savings.list_by_user(user_id)
        portfolio = self.investment_service.get_portfolio_summary(user_id)
        investment_alerts = self.investment_service.get_investment_alerts(user_id)

        return AiReportContext(
            year=year,
            month=month,
            language=language,
            total_income=str(dashboard.total_income),
            total_expense=str(dashboard.total_expense),
            net_balance=str(dashboard.net_balance),
            savings_rate=dashboard.savings_rate,
            insights=[f"{item.title}: {item.description}" for item in insights.insights],
            budgets=[
                (
                    f"{item.category_name}: spent {item.spent_amount} of {item.limit_amount} "
                    f"({item.usage_percentage:.1f}%, over_budget={item.is_over_budget}, "
                    f"near_limit={item.is_near_limit})"
                )
                for item in budget_usage
            ],
            goals=[
                (
                    f"{goal.name}: {goal.current_amount}/{goal.target_amount}, "
                    f"status={goal.status.value}, target_date={goal.target_date or 'none'}"
                )
                for goal in goals[:5]
            ],
            dollar_savings=[
                f"Manual USD savings total: {sum((item.amount for item in dollar_savings), start=Decimal('0'))}",
                f"Saved USD entries: {len(dollar_savings)}",
            ],
            investments=[
                f"Total invested: {portfolio.total_invested}",
                f"Estimated value: {portfolio.total_estimated_value}",
                f"Unrealized result: {portfolio.total_unrealized_gain_loss}",
                f"Open positions: {len(portfolio.positions)}",
                f"Investment alerts: {len(investment_alerts.alerts)}",
            ],
        )
