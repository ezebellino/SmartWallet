import json
from typing import Any

import httpx

from app.schemas.ai_report import AiReportContext, AiReportDraft


class MonthlyReportProvider:
    provider_name = "base"
    prompt_version = "monthly-report-v1"

    def generate(self, context: AiReportContext) -> AiReportDraft:
        raise NotImplementedError


class StubMonthlyReportProvider(MonthlyReportProvider):
    provider_name = "stub"

    def generate(self, context: AiReportContext) -> AiReportDraft:
        if context.language == "en":
            return self._generate_en(context)

        return self._generate_es(context)

    def _generate_en(self, context: AiReportContext) -> AiReportDraft:
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

    def _generate_es(self, context: AiReportContext) -> AiReportDraft:
        savings_label = "positiva" if context.savings_rate >= 0 else "negativa"
        insights_text = "\n".join(f"- {insight}" for insight in context.insights) or "- No se detectaron alertas."

        summary = (
            f"Reporte mensual para {context.month:02d}/{context.year}. "
            f"Los ingresos fueron {context.total_income}, los gastos fueron {context.total_expense} "
            f"y el balance neto fue {context.net_balance}. La tasa de ahorro fue "
            f"{context.savings_rate:.1f}%, considerada {savings_label} para este periodo."
        )
        recommendations = (
            "Revisa las categorias con mayor gasto, separa los consumos esenciales de los "
            "opcionales y define una accion concreta de ahorro para el proximo mes.\n"
            f"Senales detectadas:\n{insights_text}"
        )
        risk_warnings = (
            "Este reporte es educativo y se genera solo con los datos registrados. No es "
            "asesoramiento financiero profesional y debe revisarse antes de tomar decisiones."
        )

        return AiReportDraft(
            provider=self.provider_name,
            prompt_version=self.prompt_version,
            summary=summary,
            recommendations=recommendations,
            risk_warnings=risk_warnings,
        )


class OpenAIMonthlyReportProvider(MonthlyReportProvider):
    provider_name = "openai"

    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        timeout_seconds: float,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds

    def generate(self, context: AiReportContext) -> AiReportDraft:
        language_name = "Spanish" if context.language == "es" else "English"
        payload = {
            "model": self.model,
            "input": [
                {
                    "role": "system",
                    "content": (
                        "You are Smart Wallet AI, an educational personal finance assistant. "
                        f"Generate a concise monthly report in {language_name}. Use only the supplied "
                        "numbers and insights. Do not invent transactions or balances. Do not "
                        "provide professional financial, investment, tax, or legal advice."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(context.model_dump(), ensure_ascii=False),
                },
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "monthly_financial_report",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "summary": {
                                "type": "string",
                                "description": "Short executive summary of the month.",
                            },
                            "recommendations": {
                                "type": "string",
                                "description": "Actionable educational recommendations for next month.",
                            },
                            "risk_warnings": {
                                "type": "string",
                                "description": "Clear limitations and risk warnings.",
                            },
                        },
                        "required": ["summary", "recommendations", "risk_warnings"],
                    },
                }
            },
        }
        response = httpx.post(
            "https://api.openai.com/v1/responses",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        response_text = self._extract_output_text(response.json())
        generated = json.loads(response_text)

        return AiReportDraft(
            provider=self.provider_name,
            prompt_version=self.prompt_version,
            summary=generated["summary"],
            recommendations=generated["recommendations"],
            risk_warnings=generated["risk_warnings"],
        )

    def _extract_output_text(self, data: dict[str, Any]) -> str:
        output_text = data.get("output_text")
        if isinstance(output_text, str) and output_text.strip():
            return output_text

        for output_item in data.get("output", []):
            if not isinstance(output_item, dict):
                continue
            for content_item in output_item.get("content", []):
                if not isinstance(content_item, dict):
                    continue
                text = content_item.get("text")
                if content_item.get("type") == "output_text" and isinstance(text, str):
                    return text

        raise ValueError("OpenAI response did not include output text")
