from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category, CategoryType
from app.schemas.category import CategoryCreate, CategoryUpdate


class CategoryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_user(self, user_id: int) -> list[Category]:
        statement = (
            select(Category)
            .where(Category.user_id == user_id)
            .order_by(Category.type.asc(), Category.name.asc())
        )
        return list(self.db.scalars(statement).all())

    def get_by_id(self, category_id: int, user_id: int) -> Category | None:
        statement = select(Category).where(Category.id == category_id, Category.user_id == user_id)
        return self.db.scalar(statement)

    def get_by_name_and_type(
        self,
        *,
        user_id: int,
        name: str,
        category_type: CategoryType,
    ) -> Category | None:
        statement = select(Category).where(
            Category.user_id == user_id,
            Category.name == name.strip(),
            Category.type == category_type,
        )
        return self.db.scalar(statement)

    def create(self, user_id: int, data: CategoryCreate) -> Category:
        category = Category(user_id=user_id, **data.model_dump())
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def update(self, category: Category, data: CategoryUpdate) -> Category:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(category, field, value)
        self.db.commit()
        self.db.refresh(category)
        return category

    def delete(self, category: Category) -> None:
        self.db.delete(category)
        self.db.commit()

