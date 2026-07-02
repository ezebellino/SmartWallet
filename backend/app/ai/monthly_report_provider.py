from app.schemas.ai_report import AiReportContext, AiReportDraft


class MonthlyReportProvider:
    provider_name = "base"
    prompt_version = "monthly-report-v1"

    def generate(self, context: AiReportContext) -> AiReportDraft:
        raise NotImplementedError


class StubMonthlyReportProvider(MonthlyReportProvider):
    provider_name = "stub"

    def generate(self, context: AiReportContext) -> AiReportDraft:
        savings_label = "positive" if context.savings_rate >= 0 else "negative"
        insights_text = "\n".join(f"- {insight}" for insight in context.insights) or "- No alerts detected."

        summary = (
            f"Monthly report for {context.month:02d}/{context.year}. "
            f"Income was {context.total_income}, expenses were {context.total_expense}, "
            f"and net balance was {context.net_balance}. Savings rate was "
            f"{context.savings_rate:.1f}%, which is {savings_label} for this period."
        )
        recommendations = (
            "Review the highest expense categories, keep essential spending separated from "
            "optional spending, and define a concrete saving action for next month.\n"
            f"Detected signals:\n{insights_text}"
        )
        risk_warnings = (
            "This report is educational and generated from registered data only. It is not "
            "professional financial advice and should be reviewed before making decisions."
        )

        return AiReportDraft(
            provider=self.provider_name,
            prompt_version=self.prompt_version,
            summary=summary,
            recommendations=recommendations,
            risk_warnings=risk_warnings,
        )

