from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status

from app.models.investment import (
    InvestmentAsset,
    InvestmentOperation,
    InvestmentOperationType,
)
from app.repositories.investments import InvestmentRepository
from app.schemas.investment import (
    InvestmentAssetCreate,
    InvestmentAssetUpdate,
    InvestmentOperationCreate,
    InvestmentPriceSnapshotRead,
    PortfolioPosition,
    PortfolioSummary,
)


MONEY_QUANTIZER = Decimal("0.01")
QUANTITY_QUANTIZER = Decimal("0.00000001")


class InvestmentService:
    def __init__(self, investments: InvestmentRepository) -> None:
        self.investments = investments

    def list_assets(self, user_id: int) -> list[InvestmentAsset]:
        return self.investments.list_assets(user_id)

    def create_asset(self, user_id: int, data: InvestmentAssetCreate) -> InvestmentAsset:
        normalized_data = data.model_copy(
            update={
                "name": data.name.strip(),
                "symbol": data.symbol.upper().strip(),
                "currency": data.currency.upper().strip(),
            }
        )
        return self.investments.create_asset(user_id, normalized_data)

    def update_asset(
        self,
        asset_id: int,
        user_id: int,
        data: InvestmentAssetUpdate,
    ) -> InvestmentAsset:
        asset = self._get_owned_asset(asset_id, user_id)
        return self.investments.update_asset(asset, data)

    def delete_asset(self, asset_id: int, user_id: int) -> None:
        asset = self._get_owned_asset(asset_id, user_id)
        self.investments.delete_asset(asset)

    def list_operations(
        self,
        user_id: int,
        asset_id: int | None = None,
    ) -> list[InvestmentOperation]:
        if asset_id is not None:
            self._get_owned_asset(asset_id, user_id)
        return self.investments.list_operations(user_id, asset_id)

    def create_operation(
        self,
        user_id: int,
        data: InvestmentOperationCreate,
    ) -> InvestmentOperation:
        asset = self.investments.get_asset_with_operations(data.asset_id, user_id)
        if not asset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment asset not found")

        if data.operation_type == InvestmentOperationType.sell:
            available_quantity = self._calculate_quantity(asset.operations)
            if data.quantity > available_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot sell more quantity than currently owned",
                )

        return self.investments.create_operation(user_id, data)

    def list_price_snapshots(
        self,
        user_id: int,
        asset_id: int,
        limit: int = 30,
    ) -> list[InvestmentPriceSnapshotRead]:
        self._get_owned_asset(asset_id, user_id)
        return self.investments.list_price_snapshots(user_id, asset_id, limit)

    def get_portfolio_summary(self, user_id: int) -> PortfolioSummary:
        assets = self.investments.list_assets_with_operations(user_id)
        positions = [self._build_position(asset) for asset in assets]
        positions = [position for position in positions if position.quantity > 0]

        total_invested = self._money(sum((p.invested_amount for p in positions), Decimal("0")))
        total_estimated_value = self._money(
            sum((p.estimated_value or Decimal("0") for p in positions), Decimal("0"))
        )
        total_unrealized_gain_loss = self._money(
            sum((p.unrealized_gain_loss or Decimal("0") for p in positions), Decimal("0"))
        )

        return PortfolioSummary(
            total_invested=total_invested,
            total_estimated_value=total_estimated_value,
            total_unrealized_gain_loss=total_unrealized_gain_loss,
            positions=positions,
            risk_warning=(
                "Investment information is educational and does not constitute professional "
                "financial advice."
            ),
        )

    def _get_owned_asset(self, asset_id: int, user_id: int) -> InvestmentAsset:
        asset = self.investments.get_asset(asset_id, user_id)
        if not asset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment asset not found")
        return asset

    def _build_position(self, asset: InvestmentAsset) -> PortfolioPosition:
        quantity = self._calculate_quantity(asset.operations)
        invested_amount = self._calculate_net_invested(asset.operations)
        average_cost = self._money(invested_amount / quantity) if quantity > 0 else Decimal("0.00")
        estimated_value = self._money(quantity * asset.current_price) if asset.current_price is not None else None
        unrealized_gain_loss = (
            self._money(estimated_value - invested_amount) if estimated_value is not None else None
        )

        return PortfolioPosition(
            asset_id=asset.id,
            name=asset.name,
            symbol=asset.symbol,
            asset_type=asset.asset_type,
            risk_level=asset.risk_level,
            currency=asset.currency,
            quantity=quantity.quantize(QUANTITY_QUANTIZER, rounding=ROUND_HALF_UP),
            average_cost=average_cost,
            invested_amount=self._money(invested_amount),
            estimated_value=estimated_value,
            unrealized_gain_loss=unrealized_gain_loss,
        )

    def _calculate_quantity(self, operations: list[InvestmentOperation]) -> Decimal:
        quantity = Decimal("0")
        for operation in operations:
            if operation.operation_type == InvestmentOperationType.buy:
                quantity += operation.quantity
            else:
                quantity -= operation.quantity
        return quantity

    def _calculate_net_invested(self, operations: list[InvestmentOperation]) -> Decimal:
        invested = Decimal("0")
        for operation in operations:
            operation_total = operation.quantity * operation.unit_price
            if operation.operation_type == InvestmentOperationType.buy:
                invested += operation_total + operation.fees
            else:
                invested -= operation_total - operation.fees
        return max(invested, Decimal("0"))

    def _money(self, value: Decimal) -> Decimal:
        return value.quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)
