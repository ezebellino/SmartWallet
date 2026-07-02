from fastapi import HTTPException, status

from app.models.category import Category
from app.repositories.categories import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryUpdate


class CategoryService:
    def __init__(self, categories: CategoryRepository) -> None:
        self.categories = categories

    def list_categories(self, user_id: int) -> list[Category]:
        return self.categories.list_by_user(user_id)

    def create_category(self, user_id: int, data: CategoryCreate) -> Category:
        normalized_data = data.model_copy(update={"name": data.name.strip()})
        existing_category = self.categories.get_by_name_and_type(
            user_id=user_id,
            name=normalized_data.name,
            category_type=normalized_data.type,
        )
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category already exists for this type",
            )
        return self.categories.create(user_id, normalized_data)

    def update_category(self, category_id: int, user_id: int, data: CategoryUpdate) -> Category:
        category = self._get_owned_category(category_id, user_id)
        return self.categories.update(category, data)

    def delete_category(self, category_id: int, user_id: int) -> None:
        category = self._get_owned_category(category_id, user_id)
        self.categories.delete(category)

    def _get_owned_category(self, category_id: int, user_id: int) -> Category:
        category = self.categories.get_by_id(category_id, user_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        return category

