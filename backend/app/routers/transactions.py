from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.transaction import TransactionType
from app.models.user import User
from app.repositories.categories import CategoryRepository
from app.repositories.transactions import TransactionRepository
from app.schemas.transaction import TransactionCreate, TransactionRead, TransactionUpdate
from app.services.transactions import TransactionService

router = APIRouter(prefix="/transactions", tags=["transactions"])


def get_transaction_service(db: Session = Depends(get_db)) -> TransactionService:
    return TransactionService(TransactionRepository(db), CategoryRepository(db))


@router.get("", response_model=list[TransactionRead])
def list_transactions(
    start_date: date | None = None,
    end_date: date | None = None,
    transaction_type: TransactionType | None = Query(default=None, alias="type"),
    current_user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
) -> list[TransactionRead]:
    return transaction_service.list_transactions(
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        transaction_type=transaction_type,
    )


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
) -> TransactionRead:
    return transaction_service.create_transaction(current_user.id, data)


@router.patch("/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
) -> TransactionRead:
    return transaction_service.update_transaction(transaction_id, current_user.id, data)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
) -> None:
    transaction_service.delete_transaction(transaction_id, current_user.id)

