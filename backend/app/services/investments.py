from datetime import datetime, timedelta, timezone
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
    InvestmentAlert,
    InvestmentAlertsResponse,
    InvestmentAssetUpdate,
    InvestmentOperationCreate,
    InvestmentOperationUpdate,
    InvestmentPriceSnapshotRead,
    PortfolioPosition,
    PortfolioSummary,
)


MONEY_QUANTIZER = Decimal("0.01")
QUANTITY_QUANTIZER = Decimal("0.00000001")
STALE_PRICE_DAYS = 7
SHARP_PRICE_MOVE_PERCENT = Decimal("10.00")
HIGH_RISK_CONCENTRATION_PERCENT = Decimal("60.00")


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

    def update_operation(
        self,
        operation_id: int,
        user_id: int,
        data: InvestmentOperationUpdate,
    ) -> InvestmentOperation:
        operation = self.investments.get_operation(operation_id, user_id)
        if not operation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment operation not found")

        target_asset_id = data.asset_id if data.asset_id is not None else operation.asset_id
        asset = self.investments.get_asset_with_operations(target_asset_id, user_id)
        if not asset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment asset not found")

        updated_type = data.operation_type if data.operation_type is not None else operation.operation_type
        updated_quantity = data.quantity if data.quantity is not None else operation.quantity
        if updated_type == InvestmentOperationType.sell:
            other_operations = [item for item in asset.operations if item.id != operation.id]
            available_quantity = self._calculate_quantity(other_operations)
            if updated_quantity > available_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot sell more quantity than currently owned",
                )

        return self.investments.update_operation(operation, data)

    def list_price_snapshots(
        self,
        user_id: int,
        asset_id: int,
        limit: int = 30,
    ) -> list[InvestmentPriceSnapshotRead]:
        self._get_owned_asset(asset_id, user_id)
        return self.investments.list_price_snapshots(user_id, asset_id, limit)

    def get_investment_alerts(self, user_id: int) -> InvestmentAlertsResponse:
        assets = self.investments.list_assets_with_operations(user_id)
        positions = [self._build_position(asset) for asset in assets]
        positions = [position for position in positions if position.quantity > 0]
        alerts: list[InvestmentAlert] = []

        alerts.extend(self._build_price_alerts(user_id, assets))
        concentration_alert = self._build_high_risk_concentration_alert(positions)
        if concentration_alert:
            alerts.append(concentration_alert)

        severity_order = {"high": 0, "medium": 1, "low": 2}
        alerts.sort(key=lambda alert: severity_order.get(alert.severity, 99))
        return InvestmentAlertsResponse(alerts=alerts)

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

    def _build_price_alerts(self, user_id: int, assets: list[InvestmentAsset]) -> list[InvestmentAlert]:
        alerts: list[InvestmentAlert] = []
        stale_before = datetime.now(timezone.utc) - timedelta(days=STALE_PRICE_DAYS)

        for asset in assets:
            if asset.current_price is None or asset.price_updated_at is None:
                alerts.append(
                    InvestmentAlert(
                        type="missing_price",
                        severity="high",
                        title=f"{asset.symbol} has no current price",
                        description="Add a manual price or run the market refresh to include this asset in portfolio estimates.",
                        asset_id=asset.id,
                        symbol=asset.symbol,
                    )
                )
                continue

            price_updated_at = self._ensure_timezone(asset.price_updated_at)
            if price_updated_at < stale_before:
                alerts.append(
                    InvestmentAlert(
                        type="stale_price",
                        severity="medium",
                        title=f"{asset.symbol} price is stale",
                        description=f"The last price update is more than {STALE_PRICE_DAYS} days old.",
                        asset_id=asset.id,
                        symbol=asset.symbol,
                    )
                )

            snapshots = self.investments.list_latest_price_snapshots(user_id, asset.id, 2)
            if len(snapshots) < 2:
                continue

            latest, previous = snapshots[0], snapshots[1]
            if previous.price == 0:
                continue

            percentage = ((latest.price - previous.price) / previous.price * Decimal("100")).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
            )
            if abs(percentage) >= SHARP_PRICE_MOVE_PERCENT:
                alerts.append(
                    InvestmentAlert(
                        type="sharp_price_move",
                        severity="high" if abs(percentage) >= Decimal("20.00") else "medium",
                        title=f"{asset.symbol} moved {percentage:+}%",
                        description="The latest market refresh changed this asset price meaningfully versus the previous snapshot.",
                        asset_id=asset.id,
                        symbol=asset.symbol,
                        value=(latest.price - previous.price).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
                        percentage=percentage,
                    )
                )

        return alerts

    def _build_high_risk_concentration_alert(
        self,
        positions: list[PortfolioPosition],
    ) -> InvestmentAlert | None:
        total_value = sum((position.estimated_value or position.invested_amount for position in positions), Decimal("0"))
        if total_value <= 0:
            return None

        high_risk_value = sum(
            (
                position.estimated_value or position.invested_amount
                for position in positions
                if position.risk_level.value == "high"
            ),
            Decimal("0"),
        )
        percentage = (high_risk_value / total_value * Decimal("100")).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )
        if percentage < HIGH_RISK_CONCENTRATION_PERCENT:
            return None

        return InvestmentAlert(
            type="high_risk_concentration",
            severity="medium",
            title=f"High risk concentration is {percentage}%",
            description="A large share of the portfolio is allocated to high-risk assets. Review whether that matches your plan.",
            value=self._money(high_risk_value),
            percentage=percentage,
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

    def _ensure_timezone(self, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
