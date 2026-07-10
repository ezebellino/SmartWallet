import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Gauge, ShieldAlert } from "lucide-react";
import { Panel, ProgressBar } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatMoney } from "@/lib/format";
import type { CategoryExpenseIncrease, BudgetUsage, MonthlyProjection } from "@/types/api";

type HealthStatus = "strong" | "stable" | "watch" | "risk";
type SignalTone = "emerald" | "amber" | "rose";

type HealthSignal = {
  labelKey: TranslationKey;
  value: string;
  detailKey: TranslationKey;
  score: number;
  tone: SignalTone;
};

function buildSavingsSignal(savingsRate: number): HealthSignal {
  if (savingsRate >= 20) {
    return {
      labelKey: "financialHealthSavings",
      value: `${savingsRate.toFixed(1)}%`,
      detailKey: "financialHealthSavingsStrong",
      score: 30,
      tone: "emerald"
    };
  }
  if (savingsRate >= 10) {
    return {
      labelKey: "financialHealthSavings",
      value: `${savingsRate.toFixed(1)}%`,
      detailKey: "financialHealthSavingsStable",
      score: 22,
      tone: "emerald"
    };
  }
  if (savingsRate >= 0) {
    return {
      labelKey: "financialHealthSavings",
      value: `${savingsRate.toFixed(1)}%`,
      detailKey: "financialHealthSavingsWatch",
      score: 14,
      tone: "amber"
    };
  }
  return {
    labelKey: "financialHealthSavings",
    value: `${savingsRate.toFixed(1)}%`,
    detailKey: "financialHealthSavingsRisk",
    score: 4,
    tone: "rose"
  };
}

function buildProjectionSignal(projection: MonthlyProjection | null): HealthSignal {
  if (!projection) {
    return {
      labelKey: "financialHealthProjection",
      value: "-",
      detailKey: "financialHealthProjectionMissing",
      score: 10,
      tone: "amber"
    };
  }

  const projectedBalance = Number(projection.projected_net_balance);
  return projectedBalance >= 0
    ? {
        labelKey: "financialHealthProjection",
        value: formatMoney(projectedBalance),
        detailKey: "financialHealthProjectionPositive",
        score: 25,
        tone: "emerald"
      }
    : {
        labelKey: "financialHealthProjection",
        value: formatMoney(projectedBalance),
        detailKey: "financialHealthProjectionNegative",
        score: 5,
        tone: "rose"
      };
}

function buildBudgetSignal(budgetUsage: BudgetUsage[], budgetCount: number): HealthSignal {
  const overBudgetCount = budgetUsage.filter((budget) => budget.is_over_budget).length;
  const nearBudgetCount = budgetUsage.filter((budget) => budget.is_near_limit && !budget.is_over_budget).length;

  if (budgetCount === 0) {
    return {
      labelKey: "financialHealthBudgets",
      value: "0",
      detailKey: "financialHealthBudgetsMissing",
      score: 14,
      tone: "amber"
    };
  }
  if (overBudgetCount > 0) {
    return {
      labelKey: "financialHealthBudgets",
      value: String(overBudgetCount),
      detailKey: "financialHealthBudgetsOver",
      score: 4,
      tone: "rose"
    };
  }
  if (nearBudgetCount > 0) {
    return {
      labelKey: "financialHealthBudgets",
      value: String(nearBudgetCount),
      detailKey: "financialHealthBudgetsNear",
      score: 12,
      tone: "amber"
    };
  }
  return {
    labelKey: "financialHealthBudgets",
    value: String(budgetCount),
    detailKey: "financialHealthBudgetsHealthy",
    score: 25,
    tone: "emerald"
  };
}

function buildSpendingTrendSignal(increase: CategoryExpenseIncrease | null): HealthSignal {
  const category = increase?.category ?? null;
  if (!category) {
    return {
      labelKey: "financialHealthSpendingTrend",
      value: "-",
      detailKey: "financialHealthSpendingTrendHealthy",
      score: 20,
      tone: "emerald"
    };
  }

  const deltaPercentage = category.delta_percentage;
  if (deltaPercentage === null || deltaPercentage > 35) {
    return {
      labelKey: "financialHealthSpendingTrend",
      value: category.category_name,
      detailKey: "financialHealthSpendingTrendRisk",
      score: 6,
      tone: "rose"
    };
  }
  if (deltaPercentage > 15) {
    return {
      labelKey: "financialHealthSpendingTrend",
      value: category.category_name,
      detailKey: "financialHealthSpendingTrendWatch",
      score: 12,
      tone: "amber"
    };
  }
  return {
    labelKey: "financialHealthSpendingTrend",
    value: category.category_name,
    detailKey: "financialHealthSpendingTrendStable",
    score: 18,
    tone: "emerald"
  };
}

function getStatus(score: number): HealthStatus {
  if (score >= 80) {
    return "strong";
  }
  if (score >= 60) {
    return "stable";
  }
  if (score >= 40) {
    return "watch";
  }
  return "risk";
}

function getStatusCopy(status: HealthStatus): { labelKey: TranslationKey; detailKey: TranslationKey; tone: SignalTone } {
  const copies = {
    strong: {
      labelKey: "financialHealthStrong",
      detailKey: "financialHealthStrongDetail",
      tone: "emerald"
    },
    stable: {
      labelKey: "financialHealthStable",
      detailKey: "financialHealthStableDetail",
      tone: "emerald"
    },
    watch: {
      labelKey: "financialHealthWatch",
      detailKey: "financialHealthWatchDetail",
      tone: "amber"
    },
    risk: {
      labelKey: "financialHealthRisk",
      detailKey: "financialHealthRiskDetail",
      tone: "rose"
    }
  } satisfies Record<HealthStatus, { labelKey: TranslationKey; detailKey: TranslationKey; tone: SignalTone }>;

  return copies[status];
}

function signalIcon(tone: SignalTone) {
  if (tone === "emerald") {
    return <CheckCircle2 size={15} />;
  }
  if (tone === "amber") {
    return <AlertTriangle size={15} />;
  }
  return <ShieldAlert size={15} />;
}

function toneClasses(tone: SignalTone) {
  const classes = {
    emerald: {
      badge: "border-emerald/25 bg-emerald/10 text-emerald",
      icon: "bg-emerald/10 text-emerald"
    },
    amber: {
      badge: "border-amber/25 bg-amber/10 text-amber",
      icon: "bg-amber/10 text-amber"
    },
    rose: {
      badge: "border-rose/25 bg-rose/10 text-rose",
      icon: "bg-rose/10 text-rose"
    }
  } satisfies Record<SignalTone, { badge: string; icon: string }>;

  return classes[tone];
}

export function FinancialHealthPanel({
  budgetCount,
  budgetUsage,
  categoryExpenseIncrease,
  monthlyProjection,
  onReviewPlan,
  savingsRate,
  t
}: {
  budgetCount: number;
  budgetUsage: BudgetUsage[];
  categoryExpenseIncrease: CategoryExpenseIncrease | null;
  monthlyProjection: MonthlyProjection | null;
  onReviewPlan: () => void;
  savingsRate: number;
  t: (key: TranslationKey) => string;
}) {
  const signals = [
    buildSavingsSignal(savingsRate),
    buildProjectionSignal(monthlyProjection),
    buildBudgetSignal(budgetUsage, budgetCount),
    buildSpendingTrendSignal(categoryExpenseIncrease)
  ];
  const score = signals.reduce((total, signal) => total + signal.score, 0);
  const status = getStatus(score);
  const statusCopy = getStatusCopy(status);
  const statusClasses = toneClasses(statusCopy.tone);

  return (
    <Panel className="p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan">{t("financialHealthEyebrow")}</p>
          <h2 className="mt-1 text-lg font-semibold text-text">{t("financialHealthTitle")}</h2>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses.badge}`}>
          <Gauge size={14} />
          {t(statusCopy.labelKey)}
        </span>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[150px_minmax(0,1fr)]">
        <div className="rounded-lg border border-borderSoft/80 bg-white/[0.025] p-3">
          <div className="flex items-center gap-2 text-muted">
            <Activity size={16} />
            <span className="text-xs font-semibold uppercase">{t("financialHealthScore")}</span>
          </div>
          <p className="mt-2 text-3xl font-semibold leading-none text-text">{score}</p>
          <p className="mt-2 text-xs leading-5 text-muted">{t(statusCopy.detailKey)}</p>
          <div className="mt-3">
            <ProgressBar value={score} tone={statusCopy.tone} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {signals.map((signal) => (
            <div className="rounded-lg border border-borderSoft/80 bg-white/[0.025] p-2.5" key={signal.labelKey}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-muted">{t(signal.labelKey)}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-text">{signal.value}</p>
                </div>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${toneClasses(signal.tone).icon}`}>
                  {signalIcon(signal.tone)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">{t(signal.detailKey)}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan transition hover:gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/25"
        onClick={onReviewPlan}
        type="button"
      >
        {t("financialHealthAction")}
        <ArrowRight size={15} />
      </button>
    </Panel>
  );
}
