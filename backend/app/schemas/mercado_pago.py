from datetime import date, datetime

from pydantic import BaseModel, Field


class MercadoPagoIntegrationRead(BaseModel):
    enabled: bool
    status: str
    has_access_token: bool
    access_token_last4: str | None = None


class MercadoPagoIntegrationUpdate(BaseModel):
    enabled: bool | None = None
    access_token: str | None = Field(default=None, min_length=20, max_length=2048)
    clear_access_token: bool = False


class MercadoPagoReportRequest(BaseModel):
    begin_date: date
    end_date: date


class MercadoPagoReportRequestResponse(BaseModel):
    status: str
    message: str


class MercadoPagoReportRead(BaseModel):
    id: int | str | None = None
    begin_date: datetime | None = None
    end_date: datetime | None = None
    file_name: str
    created_from: str | None = None
    date_created: datetime | None = None


class MercadoPagoImportRequest(BaseModel):
    file_name: str | None = Field(default=None, max_length=260)


class MercadoPagoImportedMovement(BaseModel):
    external_id: str
    transaction_id: int | None = None
    type: str
    amount: str
    currency: str
    date: date
    status: str
    description: str


class MercadoPagoImportResponse(BaseModel):
    imported_count: int
    skipped_count: int
    failed_count: int
    file_name: str | None = None
    row_count: int = 0
    first_movement_date: date | None = None
    latest_movement_date: date | None = None
    movements: list[MercadoPagoImportedMovement]


class MercadoPagoNormalizeRequest(BaseModel):
    file_name: str | None = Field(default=None, max_length=260)


class MercadoPagoNormalizedMovement(BaseModel):
    transaction_id: int
    external_id: str
    current_description: str | None = None
    suggested_description: str


class MercadoPagoNormalizeResponse(BaseModel):
    candidate_count: int
    updated_count: int
    file_name: str | None = None
    movements: list[MercadoPagoNormalizedMovement]


class MercadoPagoSyncRequest(BaseModel):
    begin_date: date
    end_date: date


class MercadoPagoSyncResponse(BaseModel):
    status: str
    message: str
    report_requested: bool
    available_reports: int
    import_result: MercadoPagoImportResponse | None = None
