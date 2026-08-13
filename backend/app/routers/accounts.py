from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.accounts import AccountTransferRepository, FinancialAccountRepository
from app.schemas.account import (
    AccountTransferCreate,
    AccountTransferRead,
    AccountTransferUpdate,
    FinancialAccountCreate,
    FinancialAccountRead,
    FinancialAccountUpdate,
)
from app.services.accounts import AccountTransferService, FinancialAccountService

router = APIRouter(prefix="/accounts", tags=["accounts"])


def get_account_service(db: Session = Depends(get_db)) -> FinancialAccountService:
    return FinancialAccountService(FinancialAccountRepository(db), AccountTransferRepository(db))


def get_transfer_service(db: Session = Depends(get_db)) -> AccountTransferService:
    return AccountTransferService(FinancialAccountRepository(db), AccountTransferRepository(db))


@router.get("", response_model=list[FinancialAccountRead])
def list_accounts(
    current_user: User = Depends(get_current_user),
    account_service: FinancialAccountService = Depends(get_account_service),
) -> list[FinancialAccountRead]:
    return account_service.list_accounts(current_user.id)


@router.post("", response_model=FinancialAccountRead, status_code=status.HTTP_201_CREATED)
def create_account(
    data: FinancialAccountCreate,
    current_user: User = Depends(get_current_user),
    account_service: FinancialAccountService = Depends(get_account_service),
) -> FinancialAccountRead:
    return account_service.create_account(current_user.id, data)


@router.patch("/{account_id}", response_model=FinancialAccountRead)
def update_account(
    account_id: int,
    data: FinancialAccountUpdate,
    current_user: User = Depends(get_current_user),
    account_service: FinancialAccountService = Depends(get_account_service),
) -> FinancialAccountRead:
    return account_service.update_account(account_id, current_user.id, data)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    account_service: FinancialAccountService = Depends(get_account_service),
) -> None:
    account_service.delete_account(account_id, current_user.id)


@router.get("/transfers", response_model=list[AccountTransferRead])
def list_transfers(
    current_user: User = Depends(get_current_user),
    transfer_service: AccountTransferService = Depends(get_transfer_service),
) -> list[AccountTransferRead]:
    return transfer_service.list_transfers(current_user.id)


@router.post("/transfers", response_model=AccountTransferRead, status_code=status.HTTP_201_CREATED)
def create_transfer(
    data: AccountTransferCreate,
    current_user: User = Depends(get_current_user),
    transfer_service: AccountTransferService = Depends(get_transfer_service),
) -> AccountTransferRead:
    return transfer_service.create_transfer(current_user.id, data)


@router.patch("/transfers/{transfer_id}", response_model=AccountTransferRead)
def update_transfer(
    transfer_id: int,
    data: AccountTransferUpdate,
    current_user: User = Depends(get_current_user),
    transfer_service: AccountTransferService = Depends(get_transfer_service),
) -> AccountTransferRead:
    return transfer_service.update_transfer(transfer_id, current_user.id, data)


@router.delete("/transfers/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transfer(
    transfer_id: int,
    current_user: User = Depends(get_current_user),
    transfer_service: AccountTransferService = Depends(get_transfer_service),
) -> None:
    transfer_service.delete_transfer(transfer_id, current_user.id)
