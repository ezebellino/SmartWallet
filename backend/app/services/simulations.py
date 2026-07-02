from decimal import Decimal, ROUND_HALF_UP

from app.schemas.simulation import (
    CompoundInterestPoint,
    CompoundInterestRequest,
    CompoundInterestResponse,
)


MONEY_QUANTIZER = Decimal("0.01")


class SimulationService:
    def simulate_compound_interest(
        self,
        data: CompoundInterestRequest,
    ) -> CompoundInterestResponse:
        monthly_rate = (data.annual_interest_rate / Decimal("100")) / Decimal("12")
        total_months = data.years * 12
        balance = data.initial_amount
        total_contributions = data.initial_amount
        points: list[CompoundInterestPoint] = []

        for month in range(1, total_months + 1):
            balance += data.monthly_contribution
            total_contributions += data.monthly_contribution
            interest = balance * monthly_rate
            balance += interest
            total_interest = balance - total_contributions

            points.append(
                CompoundInterestPoint(
                    month=month,
                    contributed_amount=self._money(total_contributions),
                    interest_earned=self._money(total_interest),
                    balance=self._money(balance),
                )
            )

        final_balance = self._money(balance)
        total_contributions = self._money(total_contributions)
        return CompoundInterestResponse(
            final_balance=final_balance,
            total_contributions=total_contributions,
            total_interest=self._money(final_balance - total_contributions),
            points=points,
        )

    def _money(self, value: Decimal) -> Decimal:
        return value.quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)

