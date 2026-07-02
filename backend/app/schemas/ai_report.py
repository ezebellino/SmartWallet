from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AiReportGenerateRequest(BaseModel):
    year: int = Field(ge=2000, le=2100)
    month: int = Field(ge=1, le=12)
    force_regenerate: bool = False


class AiReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    period_year: int
    period_month: int
    provider: str
    prompt_version: str
    summary: str
    recommendations: str
    risk_warnings: str
    created_at: datetime
    updated_at: datetime


class AiReportContext(BaseModel):
    year: int
    month: int
    total_income: str
    total_expense: str
    net_balance: str
    savings_rate: float
    insights: list[str]


class AiReportDraft(BaseModel):
    provider: str
    prompt_version: str
    summary: str
    recommendations: str
    risk_warnings: str

