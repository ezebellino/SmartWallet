from datetime import date

from fastapi import HTTPException, status

from app.models.transaction import Transaction, TransactionType
from app.repositories.categories import CategoryRepository
from app.repositories.transactions import TransactionRepository
from app.schemas.transaction import TransactionCreate, TransactionUpdate


class TransactionService:
    def __init__(
        self,
        transactions: TransactionRepository,
        categories: CategoryRepository,
    ) -> None:
        self.transactions = transactions
        self.categories = categories

    def list_transactions(
        self,
        *,
        user_id: int,
        start_date: date | None = None,
        end_date: date | None = None,
        transaction_type: TransactionType | None = None,
    ) -> list[Transaction]:
        return self.transactions.list_by_user(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            transaction_type=transaction_type,
        )

    def create_transaction(self, user_id: int, data: TransactionCreate) -> Transaction:
        self._validate_category(user_id, data.category_id, data.type)
        return self.transactions.create(user_id, data)

    def update_transaction(
        self,
        transaction_id: int,
        user_id: int,
        data: TransactionUpdate,
    ) -> Transaction:
        transaction = self._get_owned_transaction(transaction_id, user_id)
        category_id = data.category_id if data.category_id is not None else transaction.category_id
        self._validate_category(user_id, category_id, transaction.type)
        return self.transactions.update(transaction, data)

    def delete_transaction(self, transaction_id: int, user_id: int) -> None:
        transaction = self._get_owned_transaction(transaction_id, user_id)
        self.transactions.delete(transaction)

    def _get_owned_transaction(self, transaction_id: int, user_id: int) -> Transaction:
        transaction = self.transactions.get_by_id(transaction_id, user_id)
        if not transaction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
        return transaction

    def _validate_category(
        self,
        user_id: int,
        category_id: int,
        transaction_type: TransactionType,
    ) -> None:
        category = self.categories.get_by_id(category_id, user_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        if category.type.value != transaction_type.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category type must match transaction type",
            )

