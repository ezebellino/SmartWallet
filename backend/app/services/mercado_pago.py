import base64
import csv
import hashlib
import io
from datetime import date, datetime, time, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx
from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.category import Category, CategoryType
from app.models.market_integration import MarketIntegrationSetting
from app.models.transaction import TransactionType
from app.repositories.categories import CategoryRepository
from app.repositories.transactions import TransactionRepository
from app.schemas.category import CategoryCreate
from app.schemas.mercado_pago import (
    MercadoPagoImportedMovement,
    MercadoPagoImportResponse,
    MercadoPagoIntegrationRead,
    MercadoPagoIntegrationUpdate,
    MercadoPagoNormalizedMovement,
    MercadoPagoNormalizeResponse,
    MercadoPagoReportRead,
    MercadoPagoReportRequestResponse,
    MercadoPagoSyncResponse,
)
from app.schemas.transaction import TransactionCreate

PROVIDER_KEY = "mercadopago"
EXTERNAL_SOURCE = "mercado_pago"
REPORT_COLUMNS = [
    "SOURCE_ID",
    "EXTERNAL_REFERENCE",
    "TRANSACTION_TYPE",
    "TRANSACTION_AMOUNT",
    "TRANSACTION_CURRENCY",
    "TRANSACTION_DATE",
    "SETTLEMENT_NET_AMOUNT",
    "SETTLEMENT_CURRENCY",
    "DESCRIPTION",
    "PAYER_NAME",
    "STORE_NAME",
    "POS_NAME",
    "POI_WALLET_NAME",
    "POI_BANK_NAME",
    "BUSINESS_UNIT",
    "PAYMENT_METHOD",
]


class MercadoPagoApiError(ValueError):
    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.status_code = status_code


class MercadoPagoProvider:
    def __init__(self, timeout_seconds: float = 12.0) -> None:
        self.timeout_seconds = timeout_seconds
        self.base_url = "https://api.mercadopago.com"

    def request_account_money_report(self, access_token: str, begin_date: date, end_date: date) -> None:
        self.ensure_account_money_report_config(access_token)
        response = httpx.post(
            f"{self.base_url}/v1/account/settlement_report",
            headers=self._headers(access_token),
            json={
                "begin_date": self._start_of_day(begin_date),
                "end_date": self._end_of_day(end_date),
            },
            timeout=self.timeout_seconds,
        )
        self._raise_for_status(response, "request Mercado Pago report")

    def list_account_money_reports(self, access_token: str) -> list[dict[str, Any]]:
        self.ensure_account_money_report_config(access_token)
        response = httpx.get(
            f"{self.base_url}/v1/account/settlement_report/list",
            headers=self._headers(access_token),
            timeout=self.timeout_seconds,
        )
        self._raise_for_status(response, "list Mercado Pago reports")
        data = response.json()
        return data if isinstance(data, list) else []

    def ensure_account_money_report_config(self, access_token: str) -> None:
        response = httpx.get(
            f"{self.base_url}/v1/account/settlement_report/config",
            headers=self._headers(access_token),
            timeout=self.timeout_seconds,
        )
        if response.status_code == 200:
            current_config = response.json()
            if isinstance(current_config, dict):
                self._update_config_if_missing_columns(access_token, current_config)
            return
        if response.status_code != 404:
            self._raise_for_status(response, "read Mercado Pago report configuration")

        create_response = httpx.post(
            f"{self.base_url}/v1/account/settlement_report/config",
            headers=self._headers(access_token),
            json=self._default_report_config(),
            timeout=self.timeout_seconds,
        )
        if create_response.status_code in (200, 201, 409):
            return
        self._raise_for_status(create_response, "create Mercado Pago report configuration")

    def _update_config_if_missing_columns(self, access_token: str, current_config: dict[str, Any]) -> None:
        current_columns = current_config.get("columns", [])
        current_keys = {
            str(item.get("key", "")).upper()
            for item in current_columns
            if isinstance(item, dict)
        }
        if set(REPORT_COLUMNS).issubset(current_keys):
            return

        updated_config = {
            **self._default_report_config(),
            **{
                key: value
                for key, value in current_config.items()
                if key
                in {
                    "file_name_prefix",
                    "frequency",
                    "separator",
                    "display_timezone",
                    "report_translation",
                    "header_language",
                    "scheduled",
                    "include_withdraw",
                    "refund_detailed",
                    "shipping_detail",
                    "coupon_detailed",
                    "show_chargeback_cancel",
                    "show_fee_prevision",
                }
            },
            "columns": [{"key": key} for key in REPORT_COLUMNS],
        }
        update_response = httpx.put(
            f"{self.base_url}/v1/account/settlement_report/config",
            headers=self._headers(access_token),
            json=updated_config,
            timeout=self.timeout_seconds,
        )
        self._raise_for_status(update_response, "update Mercado Pago report configuration")

    def download_account_money_report(self, access_token: str, file_name: str) -> str:
        response = httpx.get(
            f"{self.base_url}/v1/account/settlement_report/{file_name}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=self.timeout_seconds,
        )
        self._raise_for_status(response, "download Mercado Pago report")
        return response.text

    def _headers(self, access_token: str) -> dict[str, str]:
        return {
            "accept": "application/json",
            "content-type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }

    def _raise_for_status(self, response: httpx.Response, action: str) -> None:
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = self._error_message(response)
            if response.status_code == 404:
                message = (
                    f"{message}. Check that the Mercado Pago productive access token belongs to an account "
                    "with Account Money reports enabled."
                )
            raise MercadoPagoApiError(f"Could not {action}: {message}", response.status_code) from exc

    def _default_report_config(self) -> dict[str, Any]:
        return {
            "columns": [{"key": key} for key in REPORT_COLUMNS],
            "file_name_prefix": "settlement-report",
            "frequency": {"hour": 0, "value": 1, "type": "monthly"},
            "separator": ";",
            "display_timezone": "GMT-03",
            "report_translation": "es",
            "header_language": "es",
            "scheduled": False,
            "include_withdraw": True,
            "refund_detailed": True,
            "shipping_detail": False,
            "coupon_detailed": False,
            "show_chargeback_cancel": True,
            "show_fee_prevision": False,
        }

    def _error_message(self, response: httpx.Response) -> str:
        fallback = f"Mercado Pago returned HTTP {response.status_code}"
        try:
            data = response.json()
        except ValueError:
            return fallback

        if isinstance(data, dict):
            for key in ("message", "error", "detail"):
                value = data.get(key)
                if isinstance(value, str) and value:
                    return value[:500]
            cause = data.get("cause")
            if isinstance(cause, list) and cause:
                first = cause[0]
                if isinstance(first, dict):
                    description = first.get("description") or first.get("message") or first.get("code")
                    if isinstance(description, str) and description:
                        return description[:500]
        return fallback

    def _start_of_day(self, value: date) -> str:
        return datetime.combine(value, time.min, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")

    def _end_of_day(self, value: date) -> str:
        return datetime.combine(value, time.max, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


class MercadoPagoService:
    def __init__(
        self,
        db: Session,
        provider: MercadoPagoProvider | None = None,
    ) -> None:
        self.db = db
        self.provider = provider or MercadoPagoProvider()
        self.transactions = TransactionRepository(db)
        self.categories = CategoryRepository(db)

    def get_integration(self, user_id: int) -> MercadoPagoIntegrationRead:
        setting = self._get_setting(user_id)
        enabled = setting.enabled if setting else False
        has_access_token = bool(setting and setting.api_key_encrypted)
        status = "disabled"
        if enabled and has_access_token:
            status = "active"
        elif enabled:
            status = "needs_token"

        return MercadoPagoIntegrationRead(
            enabled=enabled,
            status=status,
            has_access_token=has_access_token,
            access_token_last4=setting.api_key_last4 if setting else None,
        )

    def update_integration(self, user_id: int, data: MercadoPagoIntegrationUpdate) -> MercadoPagoIntegrationRead:
        setting = self._get_or_create_setting(user_id)
        if data.enabled is not None:
            setting.enabled = data.enabled

        if data.clear_access_token:
            setting.api_key_encrypted = None
            setting.api_key_last4 = None
        elif data.access_token and data.access_token.strip():
            access_token = data.access_token.strip()
            setting.api_key_encrypted = self._encrypt(access_token)
            setting.api_key_last4 = access_token[-4:]

        self.db.commit()
        return self.get_integration(user_id)

    def request_report(self, user_id: int, begin_date: date, end_date: date) -> MercadoPagoReportRequestResponse:
        access_token = self._get_access_token(user_id)
        if not access_token:
            raise ValueError("Mercado Pago access token is required")
        if end_date < begin_date:
            raise ValueError("end_date must be greater than or equal to begin_date")

        self.provider.request_account_money_report(access_token, begin_date, end_date)
        return MercadoPagoReportRequestResponse(
            status="requested",
            message="Mercado Pago is preparing the report. Import it when it appears in the report list.",
        )

    def list_reports(self, user_id: int) -> list[MercadoPagoReportRead]:
        access_token = self._get_access_token(user_id)
        if not access_token:
            raise ValueError("Mercado Pago access token is required")
        reports = [self._build_report_read(item) for item in self.provider.list_account_money_reports(access_token)]
        return self._sort_reports(reports)

    def import_report(self, user_id: int, file_name: str | None = None) -> MercadoPagoImportResponse:
        access_token = self._get_access_token(user_id)
        if not access_token:
            raise ValueError("Mercado Pago access token is required")

        report_file_name = file_name or self._latest_report_file_name(access_token)
        if not report_file_name:
            raise ValueError("No Mercado Pago report is available to import")

        csv_text = self.provider.download_account_money_report(access_token, report_file_name)
        rows = self._parse_csv(csv_text)
        movements: list[MercadoPagoImportedMovement] = []

        for row in rows:
            try:
                movement = self._import_row(user_id, row)
            except Exception as exc:
                movement = MercadoPagoImportedMovement(
                    external_id=self._external_id(row),
                    transaction_id=None,
                    type="unknown",
                    amount="0.00",
                    currency=self._row_value(row, "TRANSACTION_CURRENCY", "SETTLEMENT_CURRENCY") or "ARS",
                    date=date.today(),
                    status="failed",
                    description=str(exc),
                )
            movements.append(movement)

        return MercadoPagoImportResponse(
            imported_count=sum(1 for item in movements if item.status == "imported"),
            skipped_count=sum(1 for item in movements if item.status == "skipped"),
            failed_count=sum(1 for item in movements if item.status == "failed"),
            file_name=report_file_name,
            movements=movements,
        )

    def preview_existing_movement_normalization(
        self,
        user_id: int,
        file_name: str | None = None,
    ) -> MercadoPagoNormalizeResponse:
        return self._normalize_existing_movements(user_id, file_name, apply_changes=False)

    def normalize_existing_movements(
        self,
        user_id: int,
        file_name: str | None = None,
    ) -> MercadoPagoNormalizeResponse:
        return self._normalize_existing_movements(user_id, file_name, apply_changes=True)

    def sync_movements(self, user_id: int, begin_date: date, end_date: date) -> MercadoPagoSyncResponse:
        access_token = self._get_access_token(user_id)
        if not access_token:
            raise ValueError("Mercado Pago access token is required")
        if end_date < begin_date:
            raise ValueError("end_date must be greater than or equal to begin_date")

        reports = self._available_reports(access_token)
        report = self._find_report_for_range(reports, begin_date, end_date)
        if report:
            import_result = self.import_report(user_id, report.file_name)
            return MercadoPagoSyncResponse(
                status="imported",
                message="Mercado Pago movements were imported from the latest matching report.",
                report_requested=False,
                available_reports=len(reports),
                import_result=import_result,
            )

        self.provider.request_account_money_report(access_token, begin_date, end_date)
        return MercadoPagoSyncResponse(
            status="pending",
            message="Mercado Pago is preparing the report. Try syncing again in a few minutes.",
            report_requested=True,
            available_reports=len(reports),
            import_result=None,
        )

    def _normalize_existing_movements(
        self,
        user_id: int,
        file_name: str | None,
        *,
        apply_changes: bool,
    ) -> MercadoPagoNormalizeResponse:
        access_token = self._get_access_token(user_id)
        if not access_token:
            raise ValueError("Mercado Pago access token is required")

        report_file_name = file_name or self._latest_report_file_name(access_token)
        if not report_file_name:
            raise ValueError("No Mercado Pago report is available to normalize movements")

        rows = self._parse_csv(self.provider.download_account_money_report(access_token, report_file_name))
        movements: list[MercadoPagoNormalizedMovement] = []

        for row in rows:
            external_id = self._external_id(row)
            transaction = self.transactions.get_by_external_reference(
                user_id=user_id,
                external_source=EXTERNAL_SOURCE,
                external_id=external_id,
            )
            if not transaction:
                continue

            suggested_description = self._description(row)
            if not self._should_normalize_description(transaction.description, suggested_description):
                continue

            movements.append(
                MercadoPagoNormalizedMovement(
                    transaction_id=transaction.id,
                    external_id=external_id,
                    current_description=transaction.description,
                    suggested_description=suggested_description,
                )
            )
            if apply_changes:
                transaction.description = suggested_description

        if apply_changes and movements:
            self.db.commit()

        return MercadoPagoNormalizeResponse(
            candidate_count=len(movements),
            updated_count=len(movements) if apply_changes else 0,
            file_name=report_file_name,
            movements=movements,
        )

    def _import_row(self, user_id: int, row: dict[str, str]) -> MercadoPagoImportedMovement:
        external_id = self._external_id(row)
        existing = self.transactions.get_by_external_reference(
            user_id=user_id,
            external_source=EXTERNAL_SOURCE,
            external_id=external_id,
        )

        amount = self._movement_amount(row)
        transaction_type = TransactionType.income if amount >= 0 else TransactionType.expense
        category = self._category_for(user_id, transaction_type)
        transaction_date = self._transaction_date(row)
        currency = self._row_value(row, "TRANSACTION_CURRENCY", "SETTLEMENT_CURRENCY") or "ARS"
        description = self._description(row)

        if existing:
            return MercadoPagoImportedMovement(
                external_id=external_id,
                transaction_id=existing.id,
                type=transaction_type.value,
                amount=f"{abs(amount):.2f}",
                currency=currency,
                date=transaction_date,
                status="skipped",
                description=description,
            )

        transaction = self.transactions.create(
            user_id,
            TransactionCreate(
                category_id=category.id,
                type=transaction_type,
                amount=abs(amount),
                currency=currency,
                description=description,
                transaction_date=transaction_date,
                external_source=EXTERNAL_SOURCE,
                external_id=external_id,
            ),
        )
        return MercadoPagoImportedMovement(
            external_id=external_id,
            transaction_id=transaction.id,
            type=transaction_type.value,
            amount=f"{transaction.amount:.2f}",
            currency=transaction.currency,
            date=transaction.transaction_date,
            status="imported",
            description=description,
        )

    def _latest_report_file_name(self, access_token: str) -> str | None:
        parsed = self._available_reports(access_token)
        return parsed[0].file_name if parsed else None

    def _available_reports(self, access_token: str) -> list[MercadoPagoReportRead]:
        reports = self.provider.list_account_money_reports(access_token)
        parsed = [self._build_report_read(item) for item in reports if item.get("file_name")]
        return self._sort_reports(parsed)

    def _find_report_for_range(
        self,
        reports: list[MercadoPagoReportRead],
        begin_date: date,
        end_date: date,
    ) -> MercadoPagoReportRead | None:
        for report in reports:
            if not report.file_name or not report.begin_date or not report.end_date:
                continue
            if report.begin_date.date() <= begin_date and report.end_date.date() >= end_date:
                return report
        return None

    def _sort_reports(self, reports: list[MercadoPagoReportRead]) -> list[MercadoPagoReportRead]:
        fallback = datetime.min.replace(tzinfo=timezone.utc)
        return sorted(reports, key=lambda item: item.date_created or fallback, reverse=True)

    def _category_for(self, user_id: int, transaction_type: TransactionType) -> Category:
        category_type = CategoryType.income if transaction_type == TransactionType.income else CategoryType.expense
        name = "Mercado Pago ingresos" if category_type == CategoryType.income else "Mercado Pago gastos"
        existing = self.categories.get_by_name_and_type(
            user_id=user_id,
            name=name,
            category_type=category_type,
        )
        if existing:
            return existing
        return self.categories.create(
            user_id,
            CategoryCreate(
                name=name,
                type=category_type,
                color="#00b1ea" if category_type == CategoryType.income else "#f59e0b",
                icon="wallet",
            ),
        )

    def _parse_csv(self, csv_text: str) -> list[dict[str, str]]:
        sample = csv_text[:2048]
        dialect = csv.Sniffer().sniff(sample, delimiters=";,")
        reader = csv.DictReader(io.StringIO(csv_text), dialect=dialect)
        return [{str(key): (value or "").strip() for key, value in row.items() if key} for row in reader]

    def _movement_amount(self, row: dict[str, str]) -> Decimal:
        raw = self._row_value(row, "SETTLEMENT_NET_AMOUNT", "REAL_AMOUNT", "TRANSACTION_AMOUNT")
        if raw is None:
            raise ValueError("Mercado Pago row does not include an amount")
        try:
            return Decimal(raw.replace(",", "."))
        except InvalidOperation as exc:
            raise ValueError(f"Invalid Mercado Pago amount: {raw}") from exc

    def _transaction_date(self, row: dict[str, str]) -> date:
        raw = self._row_value(row, "TRANSACTION_DATE", "SETTLEMENT_DATE", "DATE")
        if not raw:
            raise ValueError("Mercado Pago row does not include a transaction date")
        normalized = raw.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized).date()

    def _external_id(self, row: dict[str, str]) -> str:
        candidate = self._row_value(row, "SOURCE_ID", "EXTERNAL_REFERENCE", "ORDER_ID")
        if candidate:
            return candidate
        payload = "|".join(f"{key}={value}" for key, value in sorted(row.items()))
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def _description(self, row: dict[str, str]) -> str:
        transaction_type = self._row_value(row, "TRANSACTION_TYPE") or "Movimiento"
        human_label = self._human_description_value(
            row,
            "DESCRIPTION",
            "PAYER_NAME",
            "STORE_NAME",
            "POS_NAME",
            "POI_WALLET_NAME",
            "POI_BANK_NAME",
            "BUSINESS_UNIT",
            "PAYMENT_METHOD",
        )
        if human_label and human_label.upper() != transaction_type.upper():
            return f"Mercado Pago - {self._clean_description(human_label)}"

        source_id = self._row_value(row, "SOURCE_ID")
        external_reference = self._row_value(row, "EXTERNAL_REFERENCE")
        parts = [f"Mercado Pago - {transaction_type}"]
        if source_id:
            parts.append(f"source {source_id}")
        if external_reference and external_reference != source_id:
            parts.append(f"ref {external_reference}")
        return " | ".join(parts)

    def _human_description_value(self, row: dict[str, str], *keys: str) -> str | None:
        transaction_type = (self._row_value(row, "TRANSACTION_TYPE") or "").upper()
        technical_values = {transaction_type, "SETTLEMENT", "WITHDRAWAL", "REFUND", "CHARGEBACK", "DISPUTE", "PAYOUT"}
        for key in keys:
            value = self._row_value(row, key)
            if value and value.upper() not in technical_values:
                return value
        return None

    def _clean_description(self, value: str) -> str:
        cleaned = " ".join(value.replace("_", " ").split())
        return cleaned[:500]

    def _should_normalize_description(self, current_description: str | None, suggested_description: str) -> bool:
        if not current_description or current_description == suggested_description:
            return False
        if not suggested_description.startswith("Mercado Pago - "):
            return False
        if not self._is_technical_mercado_pago_description(current_description):
            return False
        return not self._is_technical_mercado_pago_description(suggested_description)

    def _is_technical_mercado_pago_description(self, description: str | None) -> bool:
        if not description:
            return False
        normalized = " ".join(description.split())
        if not normalized.startswith("Mercado Pago - "):
            return False
        label = normalized.removeprefix("Mercado Pago - ").split("|", maxsplit=1)[0].strip().upper()
        if "| source " in normalized or "| ref " in normalized:
            return True
        return label in {"SETTLEMENT", "WITHDRAWAL", "REFUND", "CHARGEBACK", "DISPUTE", "PAYOUT", "MOVIMIENTO"}

    def _row_value(self, row: dict[str, str], *keys: str) -> str | None:
        normalized = {key.upper().strip(): value for key, value in row.items()}
        for key in keys:
            value = normalized.get(key)
            if value:
                return value
        return None

    def _build_report_read(self, item: dict[str, Any]) -> MercadoPagoReportRead:
        return MercadoPagoReportRead(
            id=item.get("id"),
            begin_date=self._parse_datetime(item.get("begin_date")),
            end_date=self._parse_datetime(item.get("end_date")),
            file_name=str(item.get("file_name", "")),
            created_from=item.get("created_from"),
            date_created=self._parse_datetime(item.get("date_created")),
        )

    def _parse_datetime(self, value: Any) -> datetime | None:
        if not isinstance(value, str) or not value:
            return None
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed

    def _get_setting(self, user_id: int) -> MarketIntegrationSetting | None:
        statement = select(MarketIntegrationSetting).where(
            MarketIntegrationSetting.user_id == user_id,
            MarketIntegrationSetting.provider_key == PROVIDER_KEY,
        )
        return self.db.scalar(statement)

    def _get_or_create_setting(self, user_id: int) -> MarketIntegrationSetting:
        setting = self._get_setting(user_id)
        if setting:
            return setting
        setting = MarketIntegrationSetting(user_id=user_id, provider_key=PROVIDER_KEY, enabled=False)
        self.db.add(setting)
        self.db.flush()
        return setting

    def _get_access_token(self, user_id: int) -> str | None:
        setting = self._get_setting(user_id)
        if not setting or not setting.enabled or not setting.api_key_encrypted:
            return None
        return self._decrypt(setting.api_key_encrypted)

    def _encrypt(self, value: str) -> str:
        digest = hashlib.sha256(settings.jwt_secret_key.encode("utf-8")).digest()
        key = base64.urlsafe_b64encode(digest)
        return Fernet(key).encrypt(value.encode("utf-8")).decode("utf-8")

    def _decrypt(self, encrypted_value: str) -> str:
        digest = hashlib.sha256(settings.jwt_secret_key.encode("utf-8")).digest()
        key = base64.urlsafe_b64encode(digest)
        return Fernet(key).decrypt(encrypted_value.encode("utf-8")).decode("utf-8")
