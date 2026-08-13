from collections.abc import Iterable
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.binance import BinanceBalanceSnapshot


class BinanceRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_balance_snapshots(
        self,
        *,
        user_id: int,
        balances: Iterable[tuple[str, Decimal, Decimal, Decimal]],
        fetched_at: datetime,
    ) -> list[BinanceBalanceSnapshot]:
        snapshots = [
            BinanceBalanceSnapshot(
                user_id=user_id,
                asset=asset,
                free=free,
                locked=locked,
                total=total,
                fetched_at=fetched_at,
            )
            for asset, free, locked, total in balances
        ]
        self.db.add_all(snapshots)
        self.db.commit()
        for snapshot in snapshots:
            self.db.refresh(snapshot)
        return snapshots

    def list_balance_snapshots(self, *, user_id: int, limit: int = 50) -> list[BinanceBalanceSnapshot]:
        statement = (
            select(BinanceBalanceSnapshot)
            .where(BinanceBalanceSnapshot.user_id == user_id)
            .order_by(BinanceBalanceSnapshot.fetched_at.desc(), BinanceBalanceSnapshot.id.desc())
            .limit(limit)
        )
        return list(self.db.scalars(statement).all())

    def list_latest_balance_snapshots(self, user_id: int) -> list[BinanceBalanceSnapshot]:
        latest_sync_at = self.latest_sync_at(user_id)
        if latest_sync_at is None:
            return []

        statement = (
            select(BinanceBalanceSnapshot)
            .where(
                BinanceBalanceSnapshot.user_id == user_id,
                BinanceBalanceSnapshot.fetched_at == latest_sync_at,
            )
            .order_by(BinanceBalanceSnapshot.total.desc(), BinanceBalanceSnapshot.asset.asc())
        )
        return list(self.db.scalars(statement).all())

    def latest_sync_at(self, user_id: int) -> datetime | None:
        statement = (
            select(BinanceBalanceSnapshot.fetched_at)
            .where(BinanceBalanceSnapshot.user_id == user_id)
            .order_by(BinanceBalanceSnapshot.fetched_at.desc())
            .limit(1)
        )
        return self.db.scalar(statement)
