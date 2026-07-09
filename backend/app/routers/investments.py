from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.investments import InvestmentRepository
from app.schemas.investment import (
    InvestmentAssetCreate,
    InvestmentAlertsResponse,
    InvestmentAssetRead,
    InvestmentAssetUpdate,
    InvestmentOperationCreate,
    InvestmentOperationRead,
    InvestmentOperationUpdate,
    InvestmentPriceSnapshotRead,
    PortfolioSummary,
)
from app.services.investments import InvestmentService

router = APIRouter(prefix="/investments", tags=["investments"])


def get_investment_service(db: Session = Depends(get_db)) -> InvestmentService:
    return InvestmentService(InvestmentRepository(db))


@router.get("/assets", response_model=list[InvestmentAssetRead])
def list_assets(
    current_user: User = Depends(get_current_user),
    investment_service: InvestmentService = Depends(get_investment_service),
) -> list[InvestmentAssetRead]:
    return investment_service.list_assets(current_user.id)


@router.post("/assets", response_model=InvestmentAssetRead, status_code=status.HTTP_201_CREATED)
def create_asset(
    data: InvestmentAssetCreate,
    current_user: User = Depends(get_current_user),
    investment_service: InvestmentService = Depends(get_investment_service),
) -> InvestmentAssetRead:
    return investment_service.create_asset(current_user.id, data)


@router.patch("/assets/{asset_id}", response_model=InvestmentAssetRead)
def update_asset(
    asset_id: int,
    data: InvestmentAssetUpdate,
    current_user: User = Depends(get_current_user),
    investment_service: InvestmentService = Depends(get_investment_service),
) -> InvestmentAssetRead:
    return investment_service.update_asset(asset_id, current_user.id, data)


@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    investment_service: InvestmentService = Depends(get_investment_service),
) -> None:
    investment_service.delete_asset(asset_id, current_user.id)


@router.get("/operations", response_model=list[InvestmentOperationRead])
def list_operations(
    asset_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    investment_service: InvestmentService = Depends(get_investment_service),
) -> list[InvestmentOperationRead]:
    return investment_service.list_operations(current_user.id, asset_id)


@router.get("/assets/{asset_id}/price-history", response_model=list[InvestmentPriceSnapshotRead])
def list_price_history(
    asset_id: int,
    limit: int = Query(default=30, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    investment_service: InvestmentService = Depends(get_investment_service),
) -> list[InvestmentPriceSnapshotRead]:
    return investment_service.list_price_snapshots(current_user.id, asset_id, limit)


@router.post("/operations", response_model=InvestmentOperationRead, status_code=status.HTTP_201_CREATED)
def create_operation(
    data: InvestmentOperationCreate,
    current_user: User = Depends(get_current_user),
    investment_service: InvestmentService = Depends(get_investment_service),
) -> InvestmentOperationRead:
    return investment_service.create_operation(current_user.id, data)


@router.patch("/operations/{operation_id}", response_model=InvestmentOperationRead)
def update_operation(
    operation_id: int,
    data: InvestmentOperationUpdate,
    current_user: User = Depends(get_current_user),
    investment_service: InvestmentService = Depends(get_investment_service),
) -> InvestmentOperationRead:
    return investment_service.update_operation(operation_id, current_user.id, data)


@router.get("/portfolio", response_model=PortfolioSummary)
def portfolio_summary(
    current_user: User = Depends(get_current_user),
    investment_service: InvestmentService = Depends(get_investment_service),
) -> PortfolioSummary:
    return investment_service.get_portfolio_summary(current_user.id)


@router.get("/alerts", response_model=InvestmentAlertsResponse)
def investment_alerts(
    current_user: User = Depends(get_current_user),
    investment_service: InvestmentService = Depends(get_investment_service),
) -> InvestmentAlertsResponse:
    return investment_service.get_investment_alerts(current_user.id)
