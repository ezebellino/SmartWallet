from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.category import CategoryType


class CategoryBase(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    type: CategoryType
    color: str = Field(default="#22c55e", max_length=20)
    icon: str = Field(default="wallet", max_length=40)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    color: str | None = Field(default=None, max_length=20)
    icon: str | None = Field(default=None, max_length=40)


class CategoryRead(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

