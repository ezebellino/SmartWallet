from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.ai_report import AiReport
from app.schemas.ai_report import AiReportDraft


class AiReportRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_user(self, user_id: int) -> list[AiReport]:
        statement = (
            select(AiReport)
            .where(AiReport.user_id == user_id)
            .order_by(AiReport.period_year.desc(), AiReport.period_month.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_by_period(self, *, user_id: int, year: int, month: int) -> AiReport | None:
        statement = select(AiReport).where(
            AiReport.user_id == user_id,
            AiReport.period_year == year,
            AiReport.period_month == month,
        )
        return self.db.scalar(statement)

    def create(
        self,
        *,
        user_id: int,
        year: int,
        month: int,
        draft: AiReportDraft,
    ) -> AiReport:
        report = AiReport(
            user_id=user_id,
            period_year=year,
            period_month=month,
            **draft.model_dump(),
        )
        self.db.add(report)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            existing_report = self.get_by_period(user_id=user_id, year=year, month=month)
            if existing_report:
                return existing_report
            raise
        self.db.refresh(report)
        return report

    def update(self, report: AiReport, draft: AiReportDraft) -> AiReport:
        for field, value in draft.model_dump().items():
            setattr(report, field, value)
        self.db.commit()
        self.db.refresh(report)
        return report
