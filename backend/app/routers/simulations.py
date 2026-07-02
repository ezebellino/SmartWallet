from fastapi import APIRouter

from app.schemas.simulation import CompoundInterestRequest, CompoundInterestResponse
from app.services.simulations import SimulationService

router = APIRouter(prefix="/simulations", tags=["simulations"])


@router.post("/compound-interest", response_model=CompoundInterestResponse)
def compound_interest(data: CompoundInterestRequest) -> CompoundInterestResponse:
    return SimulationService().simulate_compound_interest(data)

