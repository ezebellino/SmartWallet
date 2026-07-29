import contextlib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.database.session import get_db
from app.models.user import User
from app.repositories.investments import InvestmentRepository
from app.schemas.market_data import (
    MarketDataAutoRefreshStatus,
    MarketDataIntegration,
    MarketDataIntegrationsResponse,
    MarketDataIntegrationUpdate,
    MarketDataRefreshResponse,
)
from app.services.market_data import MarketDataService
from app.services.market_data_scheduler import MarketDataAutoRefreshRunner

router = APIRouter(prefix="/market-data", tags=["market-data"])


def get_market_data_service(db: Session = Depends(get_db)) -> MarketDataService:
    return MarketDataService(InvestmentRepository(db))


def get_market_data_auto_refresh_runner(db: Session = Depends(get_db)) -> MarketDataAutoRefreshRunner:
    return MarketDataAutoRefreshRunner(
        session_factory=lambda: contextlib.nullcontext(db),
        interval_minutes=settings.market_data_refresh_interval_minutes,
    )


@router.post("/refresh-prices", response_model=MarketDataRefreshResponse)
def refresh_prices(
    current_user: User = Depends(get_current_user),
    market_data_service: MarketDataService = Depends(get_market_data_service),
) -> MarketDataRefreshResponse:
    return market_data_service.refresh_investment_prices(current_user.id)


@router.get("/auto-refresh/status", response_model=MarketDataAutoRefreshStatus)
def get_auto_refresh_status(
    current_user: User = Depends(get_current_user),
    runner: MarketDataAutoRefreshRunner = Depends(get_market_data_auto_refresh_runner),
) -> MarketDataAutoRefreshStatus:
    return runner.get_status(
        enabled=settings.market_data_auto_refresh_enabled,
        startup_delay_seconds=settings.market_data_refresh_startup_delay_seconds,
    )


@router.get("/integrations", response_model=MarketDataIntegrationsResponse)
def list_integrations(
    current_user: User = Depends(get_current_user),
    market_data_service: MarketDataService = Depends(get_market_data_service),
) -> MarketDataIntegrationsResponse:
    return market_data_service.list_integrations(current_user.id)


@router.patch("/integrations/{provider_key}", response_model=MarketDataIntegration)
def update_integration(
    provider_key: str,
    data: MarketDataIntegrationUpdate,
    current_user: User = Depends(get_current_user),
    market_data_service: MarketDataService = Depends(get_market_data_service),
) -> MarketDataIntegration:
    try:
        return market_data_service.update_integration(current_user.id, provider_key, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
