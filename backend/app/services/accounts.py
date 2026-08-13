from fastapi import HTTPException, status

from app.models.account import AccountTransfer, FinancialAccount
from app.repositories.accounts import AccountTransferRepository, FinancialAccountRepository
from app.schemas.account import (
    AccountTransferCreate,
    AccountTransferUpdate,
    FinancialAccountCreate,
    FinancialAccountUpdate,
)


class FinancialAccountService:
    def __init__(
        self,
        accounts: FinancialAccountRepository,
        transfers: AccountTransferRepository,
    ) -> None:
        self.accounts = accounts
        self.transfers = transfers

    def list_accounts(self, user_id: int) -> list[FinancialAccount]:
        return self.accounts.list_by_user(user_id)

    def create_account(self, user_id: int, data: FinancialAccountCreate) -> FinancialAccount:
        normalized_data = data.model_copy(
            update={
                "name": data.name.strip(),
                "institution": data.institution.strip() if data.institution else None,
                "notes": data.notes.strip() if data.notes else None,
            }
        )
        if self.accounts.get_by_name(user_id=user_id, name=normalized_data.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Financial account already exists",
            )
        return self.accounts.create(user_id, normalized_data)

    def update_account(self, account_id: int, user_id: int, data: FinancialAccountUpdate) -> FinancialAccount:
        account = self._get_owned_account(account_id, user_id)
        return self.accounts.update(account, data)

    def delete_account(self, account_id: int, user_id: int) -> None:
        account = self._get_owned_account(account_id, user_id)
        if account.transactions or account.transfers_out or account.transfers_in:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Financial account has movements or transfers",
            )
        self.accounts.delete(account)

    def _get_owned_account(self, account_id: int, user_id: int) -> FinancialAccount:
        account = self.accounts.get_by_id(account_id, user_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial account not found")
        return account


class AccountTransferService:
    def __init__(
        self,
        accounts: FinancialAccountRepository,
        transfers: AccountTransferRepository,
    ) -> None:
        self.accounts = accounts
        self.transfers = transfers

    def list_transfers(self, user_id: int) -> list[AccountTransfer]:
        return self.transfers.list_by_user(user_id)

    def create_transfer(self, user_id: int, data: AccountTransferCreate) -> AccountTransfer:
        self._validate_accounts(user_id, data.from_account_id, data.to_account_id)
        return self.transfers.create(user_id, data)

    def update_transfer(self, transfer_id: int, user_id: int, data: AccountTransferUpdate) -> AccountTransfer:
        transfer = self._get_owned_transfer(transfer_id, user_id)
        from_account_id = data.from_account_id if data.from_account_id is not None else transfer.from_account_id
        to_account_id = data.to_account_id if data.to_account_id is not None else transfer.to_account_id
        self._validate_accounts(user_id, from_account_id, to_account_id)
        return self.transfers.update(transfer, data)

    def delete_transfer(self, transfer_id: int, user_id: int) -> None:
        transfer = self._get_owned_transfer(transfer_id, user_id)
        self.transfers.delete(transfer)

    def _get_owned_transfer(self, transfer_id: int, user_id: int) -> AccountTransfer:
        transfer = self.transfers.get_by_id(transfer_id, user_id)
        if not transfer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account transfer not found")
        return transfer

    def _validate_accounts(self, user_id: int, from_account_id: int, to_account_id: int) -> None:
        if from_account_id == to_account_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transfer accounts must be different",
            )
        if not self.accounts.get_by_id(from_account_id, user_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source account not found")
        if not self.accounts.get_by_id(to_account_id, user_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination account not found")
