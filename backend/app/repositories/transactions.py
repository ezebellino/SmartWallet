from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.transaction import Transaction, TransactionType
from app.schemas.transaction import TransactionCreate, TransactionUpdate


class TransactionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_user(
        self,
        *,
        user_id: int,
        start_date: date | None = None,
        end_date: date | None = None,
        transaction_type: TransactionType | None = None,
    ) -> list[Transaction]:
        statement = (
            select(Transaction)
            .options(joinedload(Transaction.category))
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
        )
        if start_date:
            statement = statement.where(Transaction.transaction_date >= start_date)
        if end_date:
            statement = statement.where(Transaction.transaction_date <= end_date)
        if transaction_type:
            statement = statement.where(Transaction.type == transaction_type)
        return list(self.db.scalars(statement).all())

    def get_by_id(self, transaction_id: int, user_id: int) -> Transaction | None:
        statement = select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
        )
        return self.db.scalar(statement)

    def create(self, user_id: int, data: TransactionCreate) -> Transaction:
        transaction = Transaction(user_id=user_id, **data.model_dump())
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def update(self, transaction: Transaction, data: TransactionUpdate) -> Transaction:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(transaction, field, value)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def delete(self, transaction: Transaction) -> None:
        self.db.delete(transaction)
        self.db.commit()

