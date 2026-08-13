from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import AccountTransfer, FinancialAccount
from app.schemas.account import (
    AccountTransferCreate,
    AccountTransferUpdate,
    FinancialAccountCreate,
    FinancialAccountUpdate,
)


class FinancialAccountRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_user(self, user_id: int) -> list[FinancialAccount]:
        statement = (
            select(FinancialAccount)
            .where(FinancialAccount.user_id == user_id)
            .order_by(FinancialAccount.name.asc())
        )
        return list(self.db.scalars(statement).all())

    def get_by_id(self, account_id: int, user_id: int) -> FinancialAccount | None:
        statement = select(FinancialAccount).where(
            FinancialAccount.id == account_id,
            FinancialAccount.user_id == user_id,
        )
        return self.db.scalar(statement)

    def get_by_name(self, *, user_id: int, name: str) -> FinancialAccount | None:
        statement = select(FinancialAccount).where(
            FinancialAccount.user_id == user_id,
            FinancialAccount.name == name.strip(),
        )
        return self.db.scalar(statement)

    def create(self, user_id: int, data: FinancialAccountCreate) -> FinancialAccount:
        account = FinancialAccount(user_id=user_id, **data.model_dump())
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    def update(self, account: FinancialAccount, data: FinancialAccountUpdate) -> FinancialAccount:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(account, field, value)
        self.db.commit()
        self.db.refresh(account)
        return account

    def delete(self, account: FinancialAccount) -> None:
        self.db.delete(account)
        self.db.commit()


class AccountTransferRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_user(self, user_id: int) -> list[AccountTransfer]:
        statement = (
            select(AccountTransfer)
            .where(AccountTransfer.user_id == user_id)
            .order_by(AccountTransfer.transfer_date.desc(), AccountTransfer.id.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_by_id(self, transfer_id: int, user_id: int) -> AccountTransfer | None:
        statement = select(AccountTransfer).where(
            AccountTransfer.id == transfer_id,
            AccountTransfer.user_id == user_id,
        )
        return self.db.scalar(statement)

    def create(self, user_id: int, data: AccountTransferCreate) -> AccountTransfer:
        transfer = AccountTransfer(user_id=user_id, **data.model_dump())
        self.db.add(transfer)
        self.db.commit()
        self.db.refresh(transfer)
        return transfer

    def update(self, transfer: AccountTransfer, data: AccountTransferUpdate) -> AccountTransfer:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(transfer, field, value)
        self.db.commit()
        self.db.refresh(transfer)
        return transfer

    def delete(self, transfer: AccountTransfer) -> None:
        self.db.delete(transfer)
        self.db.commit()
