from fastapi import HTTPException, status

from app.models.dollar_saving import DollarSaving
from app.repositories.dollar_savings import DollarSavingRepository
from app.schemas.dollar_saving import DollarSavingCreate, DollarSavingUpdate


class DollarSavingService:
    def __init__(self, dollar_savings: DollarSavingRepository) -> None:
        self.dollar_savings = dollar_savings

    def list_dollar_savings(self, user_id: int) -> list[DollarSaving]:
        return self.dollar_savings.list_by_user(user_id)

    def create_dollar_saving(self, user_id: int, data: DollarSavingCreate) -> DollarSaving:
        return self.dollar_savings.create(user_id, data)

    def update_dollar_saving(self, dollar_saving_id: int, user_id: int, data: DollarSavingUpdate) -> DollarSaving:
        dollar_saving = self._get_owned_dollar_saving(dollar_saving_id, user_id)
        return self.dollar_savings.update(dollar_saving, data)

    def delete_dollar_saving(self, dollar_saving_id: int, user_id: int) -> None:
        dollar_saving = self._get_owned_dollar_saving(dollar_saving_id, user_id)
        self.dollar_savings.delete(dollar_saving)

    def _get_owned_dollar_saving(self, dollar_saving_id: int, user_id: int) -> DollarSaving:
        dollar_saving = self.dollar_savings.get_by_id(dollar_saving_id, user_id)
        if not dollar_saving:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dollar saving not found")
        return dollar_saving
