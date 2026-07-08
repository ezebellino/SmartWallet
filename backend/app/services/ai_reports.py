import logging

from app.ai.monthly_report_provider import MonthlyReportProvider, StubMonthlyReportProvider
from app.models.ai_report import AiReport
from app.repositories.ai_reports import AiReportRepository
from app.schemas.ai_report import AiReportContext
from app.schemas.dashboard import MonthlySummary
from app.schemas.insight import SpendingInsightsResponse
from app.services.dashboard import DashboardService
from app.services.insights import InsightService

logger = logging.getLogger(__name__)


class AiReportService:
    def __init__(
        self,
        reports: AiReportRepository,
        dashboard_service: DashboardService,
        insight_service: InsightService,
        provider: MonthlyReportProvider | None = None,
        fallback_provider: MonthlyReportProvider | None = None,
    ) -> None:
        self.reports = reports
        self.dashboard_service = dashboard_service
        self.insight_service = insight_service
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
    ) -> AiReport:
        existing_report = self.reports.get_by_period(user_id=user_id, year=year, month=month)
        if existing_report and not force_regenerate:
            return existing_report

        dashboard = self.dashboard_service.get_monthly_summary(user_id=user_id, year=year, month=month)
        insights = self.insight_service.get_spending_insights(user_id=user_id, year=year, month=month)
        context = self._build_context(year=year, month=month, dashboard=dashboard, insights=insights)
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
        year: int,
        month: int,
        dashboard: MonthlySummary,
        insights: SpendingInsightsResponse,
    ) -> AiReportContext:
        return AiReportContext(
            year=year,
            month=month,
            total_income=str(dashboard.total_income),
            total_expense=str(dashboard.total_expense),
            net_balance=str(dashboard.net_balance),
            savings_rate=dashboard.savings_rate,
            insights=[f"{item.title}: {item.description}" for item in insights.insights],
        )
