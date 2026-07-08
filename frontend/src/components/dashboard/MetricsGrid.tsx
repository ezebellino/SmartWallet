import { PiggyBank, ReceiptText, Target, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatMoney } from "@/lib/format";
import type { DashboardSection } from "@/components/dashboard/DashboardSectionNav";

type Metrics = {
  balance: number;
  income: number;
  expenses: number;
  savingsRate: number;
};

export function MetricsGrid({
  metrics,
  onSectionChange,
  t
}: {
  metrics: Metrics;
  onSectionChange: (section: DashboardSection) => void;
  t: (key: TranslationKey) => string;
}) {
  const balanceTone = metrics.balance < 0 ? "bad" : "good";
  const savingsTone = metrics.savingsRate >= 20 ? "good" : metrics.savingsRate >= 0 ? "warn" : "bad";

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        actionLabel={t("metricActionReviewMovements")}
        detail={t("realDataMetric")}
        icon={<PiggyBank size={17} />}
        label={t("monthlyBalance")}
        onClick={() => onSectionChange("movements")}
        tone={balanceTone}
        value={formatMoney(metrics.balance)}
      />
      <MetricCard
        actionLabel={t("metricActionAddIncome")}
        detail={t("registeredIncome")}
        icon={<TrendingUp size={17} />}
        label={t("income")}
        onClick={() => onSectionChange("movements")}
        tone="neutral"
        value={formatMoney(metrics.income)}
      />
      <MetricCard
        actionLabel={t("metricActionViewBudgets")}
        detail={t("registeredExpenses")}
        icon={<ReceiptText size={17} />}
        label={t("expenses")}
        onClick={() => onSectionChange("budgets")}
        tone="bad"
        value={formatMoney(metrics.expenses)}
      />
      <MetricCard
        actionLabel={t("metricActionCreateGoal")}
        detail={t("calculatedFromMovements")}
        icon={<Target size={17} />}
        label={t("savingsRate")}
        onClick={() => onSectionChange("goals")}
        tone={savingsTone}
        value={`${metrics.savingsRate.toFixed(1)}%`}
      />
    </div>
  );
}
