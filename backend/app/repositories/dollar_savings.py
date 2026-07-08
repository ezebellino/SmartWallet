from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.dollar_saving import DollarSaving
from app.schemas.dollar_saving import DollarSavingCreate, DollarSavingUpdate


class DollarSavingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_user(self, user_id: int) -> list[DollarSaving]:
        statement = (
            select(DollarSaving)
            .where(DollarSaving.user_id == user_id)
            .order_by(DollarSaving.saved_at.desc().nullslast(), DollarSaving.created_at.desc(), DollarSaving.id.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_by_id(self, dollar_saving_id: int, user_id: int) -> DollarSaving | None:
        statement = select(DollarSaving).where(
            DollarSaving.id == dollar_saving_id,
            DollarSaving.user_id == user_id,
        )
        return self.db.scalar(statement)

    def create(self, user_id: int, data: DollarSavingCreate) -> DollarSaving:
        dollar_saving = DollarSaving(user_id=user_id, **data.model_dump())
        self.db.add(dollar_saving)
        self.db.commit()
        self.db.refresh(dollar_saving)
        return dollar_saving

    def update(self, dollar_saving: DollarSaving, data: DollarSavingUpdate) -> DollarSaving:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(dollar_saving, field, value)
        self.db.commit()
        self.db.refresh(dollar_saving)
        return dollar_saving

    def delete(self, dollar_saving: DollarSaving) -> None:
        self.db.delete(dollar_saving)
        self.db.commit()
