from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.investment import InvestmentAsset, InvestmentOperation, InvestmentPriceSnapshot
from app.models.mixins import utc_now
from app.schemas.investment import (
    InvestmentAssetCreate,
    InvestmentAssetUpdate,
    InvestmentOperationCreate,
    InvestmentOperationUpdate,
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
        values = data.model_dump()
        if values.get("current_price") is not None:
            values["price_source"] = "manual"
            values["price_updated_at"] = utc_now()
        asset = InvestmentAsset(user_id=user_id, **values)
        self.db.add(asset)
        self.db.commit()
        self.db.refresh(asset)
        return asset

    def update_asset(self, asset: InvestmentAsset, data: InvestmentAssetUpdate) -> InvestmentAsset:
        values = data.model_dump(exclude_unset=True)
        for field, value in values.items():
            setattr(asset, field, value)
        if "current_price" in values:
            asset.price_source = "manual" if values["current_price"] is not None else None
            asset.price_updated_at = utc_now() if values["current_price"] is not None else None
        self.db.commit()
        self.db.refresh(asset)
        return asset

    def update_asset_market_price(
        self,
        asset: InvestmentAsset,
        price: Decimal,
        provider: str,
        currency: str,
        fetched_at: datetime,
    ) -> InvestmentAsset:
        asset.current_price = price
        asset.price_source = provider
        asset.price_updated_at = fetched_at
        snapshot = InvestmentPriceSnapshot(
            user_id=asset.user_id,
            asset_id=asset.id,
            provider=provider,
            price=price,
            currency=currency.upper(),
            fetched_at=fetched_at,
        )
        self.db.add(snapshot)
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

    def get_operation(self, operation_id: int, user_id: int) -> InvestmentOperation | None:
        statement = select(InvestmentOperation).where(
            InvestmentOperation.id == operation_id,
            InvestmentOperation.user_id == user_id,
        )
        return self.db.scalar(statement)

    def update_operation(
        self,
        operation: InvestmentOperation,
        data: InvestmentOperationUpdate,
    ) -> InvestmentOperation:
        values = data.model_dump(exclude_unset=True)
        for field, value in values.items():
            setattr(operation, field, value)
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

    def list_price_snapshots(
        self,
        user_id: int,
        asset_id: int,
        limit: int = 30,
    ) -> list[InvestmentPriceSnapshot]:
        statement = (
            select(InvestmentPriceSnapshot)
            .where(
                InvestmentPriceSnapshot.user_id == user_id,
                InvestmentPriceSnapshot.asset_id == asset_id,
            )
            .order_by(InvestmentPriceSnapshot.fetched_at.desc(), InvestmentPriceSnapshot.id.desc())
            .limit(limit)
        )
        return list(self.db.scalars(statement).all())

    def list_latest_price_snapshots(self, user_id: int, asset_id: int, limit: int = 2) -> list[InvestmentPriceSnapshot]:
        return self.list_price_snapshots(user_id, asset_id, limit)
