from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.investments import InvestmentRepository
from app.schemas.market_data import MarketDataRefreshResponse
from app.services.market_data import MarketDataService

router = APIRouter(prefix="/market-data", tags=["market-data"])


def get_market_data_service(db: Session = Depends(get_db)) -> MarketDataService:
    return MarketDataService(InvestmentRepository(db))


@router.post("/refresh-prices", response_model=MarketDataRefreshResponse)
def refresh_prices(
    current_user: User = Depends(get_current_user),
    market_data_service: MarketDataService = Depends(get_market_data_service),
) -> MarketDataRefreshResponse:
    return market_data_service.refresh_investment_prices(current_user.id)

