from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.mercado_pago import (
    MercadoPagoImportRequest,
    MercadoPagoImportResponse,
    MercadoPagoIntegrationRead,
    MercadoPagoIntegrationUpdate,
    MercadoPagoNormalizeRequest,
    MercadoPagoNormalizeResponse,
    MercadoPagoReportRead,
    MercadoPagoReportRequest,
    MercadoPagoReportRequestResponse,
    MercadoPagoSyncRequest,
    MercadoPagoSyncResponse,
)
from app.services.mercado_pago import MercadoPagoService

router = APIRouter(prefix="/mercado-pago", tags=["mercado-pago"])


def get_mercado_pago_service(db: Session = Depends(get_db)) -> MercadoPagoService:
    return MercadoPagoService(db)


@router.get("/integration", response_model=MercadoPagoIntegrationRead)
def get_integration(
    current_user: User = Depends(get_current_user),
    service: MercadoPagoService = Depends(get_mercado_pago_service),
) -> MercadoPagoIntegrationRead:
    return service.get_integration(current_user.id)


@router.patch("/integration", response_model=MercadoPagoIntegrationRead)
def update_integration(
    data: MercadoPagoIntegrationUpdate,
    current_user: User = Depends(get_current_user),
    service: MercadoPagoService = Depends(get_mercado_pago_service),
) -> MercadoPagoIntegrationRead:
    return service.update_integration(current_user.id, data)


@router.post("/reports", response_model=MercadoPagoReportRequestResponse, status_code=status.HTTP_202_ACCEPTED)
def request_report(
    data: MercadoPagoReportRequest,
    current_user: User = Depends(get_current_user),
    service: MercadoPagoService = Depends(get_mercado_pago_service),
) -> MercadoPagoReportRequestResponse:
    try:
        return service.request_report(current_user.id, data.begin_date, data.end_date)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/reports", response_model=list[MercadoPagoReportRead])
def list_reports(
    current_user: User = Depends(get_current_user),
    service: MercadoPagoService = Depends(get_mercado_pago_service),
) -> list[MercadoPagoReportRead]:
    try:
        return service.list_reports(current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/import", response_model=MercadoPagoImportResponse)
def import_report(
    data: MercadoPagoImportRequest,
    current_user: User = Depends(get_current_user),
    service: MercadoPagoService = Depends(get_mercado_pago_service),
) -> MercadoPagoImportResponse:
    try:
        return service.import_report(current_user.id, data.file_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/normalize-preview", response_model=MercadoPagoNormalizeResponse)
def preview_normalization(
    data: MercadoPagoNormalizeRequest,
    current_user: User = Depends(get_current_user),
    service: MercadoPagoService = Depends(get_mercado_pago_service),
) -> MercadoPagoNormalizeResponse:
    try:
        return service.preview_existing_movement_normalization(current_user.id, data.file_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/normalize", response_model=MercadoPagoNormalizeResponse)
def normalize_movements(
    data: MercadoPagoNormalizeRequest,
    current_user: User = Depends(get_current_user),
    service: MercadoPagoService = Depends(get_mercado_pago_service),
) -> MercadoPagoNormalizeResponse:
    try:
        return service.normalize_existing_movements(current_user.id, data.file_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/sync", response_model=MercadoPagoSyncResponse)
def sync_movements(
    data: MercadoPagoSyncRequest,
    current_user: User = Depends(get_current_user),
    service: MercadoPagoService = Depends(get_mercado_pago_service),
) -> MercadoPagoSyncResponse:
    try:
        return service.sync_movements(current_user.id, data.begin_date, data.end_date)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
