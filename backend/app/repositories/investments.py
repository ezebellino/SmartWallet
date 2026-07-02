from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.investment import InvestmentAsset, InvestmentOperation
from app.schemas.investment import (
    InvestmentAssetCreate,
    InvestmentAssetUpdate,
    InvestmentOperationCreate,
)


class InvestmentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_assets(self, user_id: int) -> list[InvestmentAsset]:
        statement = (
            select(InvestmentAsset)
            .where(InvestmentAsset.user_id == user_id)
            .order_by(InvestmentAsset.asset_type.asc(), InvestmentAsset.symbol.asc())
        )
        return list(self.db.scalars(statement).all())

    def get_asset(self, asset_id: int, user_id: int) -> InvestmentAsset | None:
        statement = select(InvestmentAsset).where(
            InvestmentAsset.id == asset_id,
            InvestmentAsset.user_id == user_id,
        )
        return self.db.scalar(statement)

    def get_asset_with_operations(self, asset_id: int, user_id: int) -> InvestmentAsset | None:
        statement = (
            select(InvestmentAsset)
            .options(selectinload(InvestmentAsset.operations))
            .where(InvestmentAsset.id == asset_id, InvestmentAsset.user_id == user_id)
        )
        return self.db.scalar(statement)

    def list_assets_with_operations(self, user_id: int) -> list[InvestmentAsset]:
        statement = (
            select(InvestmentAsset)
            .options(selectinload(InvestmentAsset.operations))
            .where(InvestmentAsset.user_id == user_id)
            .order_by(InvestmentAsset.symbol.asc())
        )
        return list(self.db.scalars(statement).all())

    def create_asset(self, user_id: int, data: InvestmentAssetCreate) -> InvestmentAsset:
        asset = InvestmentAsset(user_id=user_id, **data.model_dump())
        self.db.add(asset)
        self.db.commit()
        self.db.refresh(asset)
        return asset

    def update_asset(self, asset: InvestmentAsset, data: InvestmentAssetUpdate) -> InvestmentAsset:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(asset, field, value)
        self.db.commit()
        self.db.refresh(asset)
        return asset

    def delete_asset(self, asset: InvestmentAsset) -> None:
        self.db.delete(asset)
        self.db.commit()

    def create_operation(self, user_id: int, data: InvestmentOperationCreate) -> InvestmentOperation:
        operation = InvestmentOperation(user_id=user_id, **data.model_dump())
        self.db.add(operation)
        self.db.commit()
        self.db.refresh(operation)
        return operation

    def list_operations(self, user_id: int, asset_id: int | None = None) -> list[InvestmentOperation]:
        statement = (
            select(InvestmentOperation)
            .where(InvestmentOperation.user_id == user_id)
            .order_by(InvestmentOperation.operation_date.desc(), InvestmentOperation.id.desc())
        )
        if asset_id is not None:
            statement = statement.where(InvestmentOperation.asset_id == asset_id)
        return list(self.db.scalars(statement).all())

