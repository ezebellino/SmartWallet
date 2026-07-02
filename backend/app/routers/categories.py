from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.categories import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.services.categories import CategoryService

router = APIRouter(prefix="/categories", tags=["categories"])


def get_category_service(db: Session = Depends(get_db)) -> CategoryService:
    return CategoryService(CategoryRepository(db))


@router.get("", response_model=list[CategoryRead])
def list_categories(
    current_user: User = Depends(get_current_user),
    category_service: CategoryService = Depends(get_category_service),
) -> list[CategoryRead]:
    return category_service.list_categories(current_user.id)


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    category_service: CategoryService = Depends(get_category_service),
) -> CategoryRead:
    return category_service.create_category(current_user.id, data)


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    category_service: CategoryService = Depends(get_category_service),
) -> CategoryRead:
    return category_service.update_category(category_id, current_user.id, data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    category_service: CategoryService = Depends(get_category_service),
) -> None:
    category_service.delete_category(category_id, current_user.id)

