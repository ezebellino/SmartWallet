import { MetricCard } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatMoney } from "@/lib/format";

type Metrics = {
  balance: number;
  income: number;
  expenses: number;
  savingsRate: number;
};

export function MetricsGrid({ metrics, t }: { metrics: Metrics; t: (key: TranslationKey) => string }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label={t("monthlyBalance")} value={formatMoney(metrics.balance)} detail={t("realDataMetric")} tone="good" />
      <MetricCard label={t("income")} value={formatMoney(metrics.income)} detail={t("registeredIncome")} tone="neutral" />
      <MetricCard label={t("expenses")} value={formatMoney(metrics.expenses)} detail={t("registeredExpenses")} tone="bad" />
      <MetricCard label={t("savingsRate")} value={`${metrics.savingsRate.toFixed(1)}%`} detail={t("calculatedFromMovements")} tone="good" />
    </div>
  );
}
