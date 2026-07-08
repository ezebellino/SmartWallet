from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.dollar_savings import DollarSavingRepository
from app.schemas.dollar_saving import DollarSavingCreate, DollarSavingRead, DollarSavingUpdate
from app.services.dollar_savings import DollarSavingService

router = APIRouter(prefix="/dollar-savings", tags=["dollar savings"])


def get_dollar_saving_service(db: Session = Depends(get_db)) -> DollarSavingService:
    return DollarSavingService(DollarSavingRepository(db))


@router.get("", response_model=list[DollarSavingRead])
def list_dollar_savings(
    current_user: User = Depends(get_current_user),
    dollar_saving_service: DollarSavingService = Depends(get_dollar_saving_service),
) -> list[DollarSavingRead]:
    return dollar_saving_service.list_dollar_savings(current_user.id)


@router.post("", response_model=DollarSavingRead, status_code=status.HTTP_201_CREATED)
def create_dollar_saving(
    data: DollarSavingCreate,
    current_user: User = Depends(get_current_user),
    dollar_saving_service: DollarSavingService = Depends(get_dollar_saving_service),
) -> DollarSavingRead:
    return dollar_saving_service.create_dollar_saving(current_user.id, data)


@router.patch("/{dollar_saving_id}", response_model=DollarSavingRead)
def update_dollar_saving(
    dollar_saving_id: int,
    data: DollarSavingUpdate,
    current_user: User = Depends(get_current_user),
    dollar_saving_service: DollarSavingService = Depends(get_dollar_saving_service),
) -> DollarSavingRead:
    return dollar_saving_service.update_dollar_saving(dollar_saving_id, current_user.id, data)


@router.delete("/{dollar_saving_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dollar_saving(
    dollar_saving_id: int,
    current_user: User = Depends(get_current_user),
    dollar_saving_service: DollarSavingService = Depends(get_dollar_saving_service),
) -> None:
    dollar_saving_service.delete_dollar_saving(dollar_saving_id, current_user.id)
