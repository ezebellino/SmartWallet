import { AlertTriangle, ArrowRight, Bell, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatMoney } from "@/lib/format";
import type { BudgetUsage, CategoryExpenseIncrease, InvestmentAlertsResponse, MonthlyProjection } from "@/types/api";
import type { DashboardSection } from "@/components/dashboard/DashboardSectionNav";

type AlertSeverity = "high" | "medium" | "low";

type PriorityAlert = {
  id: string;
  severity: AlertSeverity;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  detail?: string;
  section: DashboardSection;
};

const severityRank: Record<AlertSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2
};

const severityStyles = {
  high: {
    card: "border-rose/30 bg-rose/10",
    icon: "bg-rose/15 text-rose",
    pill: "border-rose/30 text-rose"
  },
  medium: {
    card: "border-amber/30 bg-amber/10",
    icon: "bg-amber/15 text-amber",
    pill: "border-amber/30 text-amber"
  },
  low: {
    card: "border-cyan/25 bg-cyan/10",
    icon: "bg-cyan/15 text-cyan",
    pill: "border-cyan/30 text-cyan"
  }
} satisfies Record<AlertSeverity, { card: string; icon: string; pill: string }>;

function severityIcon(severity: AlertSeverity) {
  if (severity === "high") {
    return <ShieldAlert size={16} />;
  }
  if (severity === "medium") {
    return <AlertTriangle size={16} />;
  }
  return <Info size={16} />;
}

function buildAlerts({
  budgetUsage,
  categoryExpenseIncrease,
  investmentAlerts,
  monthlyProjection,
  reportReady
}: {
  budgetUsage: BudgetUsage[];
  categoryExpenseIncrease: CategoryExpenseIncrease | null;
  investmentAlerts: InvestmentAlertsResponse | null;
  monthlyProjection: MonthlyProjection | null;
  reportReady: boolean;
}): PriorityAlert[] {
  const alerts: PriorityAlert[] = [];
  const overBudget = budgetUsage.filter((budget) => budget.is_over_budget);
  const nearBudget = budgetUsage.filter((budget) => budget.is_near_limit && !budget.is_over_budget);

  if (overBudget.length > 0) {
    alerts.push({
      id: "budget-over",
      severity: "high",
      titleKey: "priorityAlertBudgetOverTitle",
      bodyKey: "priorityAlertBudgetOverBody",
      detail: String(overBudget.length),
      section: "budgets"
    });
  }

  if (Number(monthlyProjection?.projected_net_balance ?? 0) < 0) {
    alerts.push({
      id: "projected-negative",
      severity: "high",
      titleKey: "priorityAlertProjectionNegativeTitle",
      bodyKey: "priorityAlertProjectionNegativeBody",
      detail: formatMoney(Number(monthlyProjection?.projected_net_balance ?? 0)),
      section: "movements"
    });
  }

  const highInvestmentAlerts = investmentAlerts?.alerts.filter((alert) => alert.severity === "high") ?? [];
  if (highInvestmentAlerts.length > 0) {
    alerts.push({
      id: "investment-high",
      severity: "high",
      titleKey: "priorityAlertInvestmentHighTitle",
      bodyKey: "priorityAlertInvestmentHighBody",
      detail: String(highInvestmentAlerts.length),
      section: "investments"
    });
  }

  if (nearBudget.length > 0) {
    alerts.push({
      id: "budget-near",
      severity: "medium",
      titleKey: "priorityAlertBudgetNearTitle",
      bodyKey: "priorityAlertBudgetNearBody",
      detail: String(nearBudget.length),
      section: "budgets"
    });
  }

  const categoryIncrease = categoryExpenseIncrease?.category ?? null;
  if (categoryIncrease) {
    alerts.push({
      id: "category-increase",
      severity: categoryIncrease.delta_percentage === null || categoryIncrease.delta_percentage > 35 ? "medium" : "low",
      titleKey: "priorityAlertCategoryIncreaseTitle",
      bodyKey: "priorityAlertCategoryIncreaseBody",
      detail: `${categoryIncrease.category_name} +${formatMoney(Number(categoryIncrease.delta))}`,
      section: "movements"
    });
  }

  const mediumInvestmentAlerts = investmentAlerts?.alerts.filter((alert) => alert.severity === "medium") ?? [];
  if (mediumInvestmentAlerts.length > 0) {
    alerts.push({
      id: "investment-medium",
      severity: "medium",
      titleKey: "priorityAlertInvestmentMediumTitle",
      bodyKey: "priorityAlertInvestmentMediumBody",
      detail: String(mediumInvestmentAlerts.length),
      section: "investments"
    });
  }

  if (!reportReady) {
    alerts.push({
      id: "ai-report-pending",
      severity: "low",
      titleKey: "priorityAlertAiReportTitle",
      bodyKey: "priorityAlertAiReportBody",
      section: "aiReports"
    });
  }

  return alerts.sort((left, right) => severityRank[left.severity] - severityRank[right.severity]).slice(0, 6);
}

export function PrioritizedAlertsPanel({
  budgetUsage,
  categoryExpenseIncrease,
  investmentAlerts,
  monthlyProjection,
  onSectionChange,
  reportReady,
  t
}: {
  budgetUsage: BudgetUsage[];
  categoryExpenseIncrease: CategoryExpenseIncrease | null;
  investmentAlerts: InvestmentAlertsResponse | null;
  monthlyProjection: MonthlyProjection | null;
  onSectionChange: (section: DashboardSection) => void;
  reportReady: boolean;
  t: (key: TranslationKey) => string;
}) {
  const alerts = buildAlerts({
    budgetUsage,
    categoryExpenseIncrease,
    investmentAlerts,
    monthlyProjection,
    reportReady
  });
  const highCount = alerts.filter((alert) => alert.severity === "high").length;
  const visibleAlerts = alerts.slice(0, 3);
  const remainingAlerts = Math.max(alerts.length - visibleAlerts.length, 0);

  return (
    <Panel className="p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan">{t("priorityAlertsEyebrow")}</p>
          <h2 className="mt-1 text-lg font-semibold text-text">{t("priorityAlertsTitle")}</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-borderSoft px-2.5 py-1 text-xs font-semibold text-muted">
          <Bell size={14} />
          {alerts.length} {t("priorityAlertsCount")}
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald/25 bg-emerald/10 p-4 text-sm text-muted">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald" />
          <div>
            <p className="font-semibold text-text">{t("priorityAlertsEmptyTitle")}</p>
            <p className="mt-1">{t("priorityAlertsEmptyBody")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {highCount > 0 ? (
            <div className="rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-sm font-medium text-rose">
              {highCount} {t("priorityAlertsHighSummary")}
            </div>
          ) : null}

          {visibleAlerts.map((alert) => {
            const styles = severityStyles[alert.severity];
            return (
              <div className={`rounded-lg border p-2.5 ${styles.card}`} key={alert.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${styles.icon}`}>
                        {severityIcon(alert.severity)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text">{t(alert.titleKey)}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{t(alert.bodyKey)}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold uppercase ${styles.pill}`}>
                    {t(`prioritySeverity${alert.severity}` as TranslationKey)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-text">{alert.detail ?? t("priorityAlertActionRequired")}</span>
                  <button
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan transition hover:gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/25"
                    onClick={() => onSectionChange(alert.section)}
                    type="button"
                  >
                    {t("priorityAlertOpenAction")}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {remainingAlerts > 0 ? (
            <p className="rounded-lg border border-borderSoft/70 bg-white/[0.025] px-3 py-2 text-sm text-muted">
              +{remainingAlerts} {t("priorityAlertsMore")}
            </p>
          ) : null}
        </div>
      )}
    </Panel>
  );
}
