import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatMoney } from "@/lib/format";
import type { MonthlyComparison, MonthlyComparisonMetric } from "@/types/api";

type MetricKey = "total_income" | "total_expense" | "net_balance" | "savings_rate";

type MetricConfig = {
  key: MetricKey;
  labelKey: TranslationKey;
  isCurrency: boolean;
  lowerIsBetter?: boolean;
};

const metricConfigs: MetricConfig[] = [
  { key: "total_income", labelKey: "income", isCurrency: true },
  { key: "total_expense", labelKey: "expenses", isCurrency: true, lowerIsBetter: true },
  { key: "net_balance", labelKey: "monthlyBalance", isCurrency: true },
  { key: "savings_rate", labelKey: "savingsRate", isCurrency: false }
];

function toNumber(value: string | number) {
  return typeof value === "number" ? value : Number(value);
}

function formatMetricValue(value: string | number, isCurrency: boolean) {
  const numericValue = toNumber(value);
  return isCurrency ? formatMoney(numericValue) : `${numericValue.toFixed(1)}%`;
}

function buildDeltaLabel(metric: MonthlyComparisonMetric, isCurrency: boolean, t: (key: TranslationKey) => string) {
  const delta = toNumber(metric.delta);
  const absoluteDelta = formatMetricValue(Math.abs(delta), isCurrency);

  if (delta === 0) {
    return t("monthlyComparisonNoChange");
  }

  const percentLabel =
    metric.delta_percentage === null ? t("monthlyComparisonNoPreviousBase") : `${Math.abs(metric.delta_percentage).toFixed(1)}%`;

  return `${delta > 0 ? "+" : "-"}${absoluteDelta} (${percentLabel})`;
}

function getTone(metric: MonthlyComparisonMetric, lowerIsBetter = false) {
  const delta = toNumber(metric.delta);
  if (delta === 0) {
    return {
      className: "border-white/10 bg-white/[0.025] text-muted",
      textClassName: "text-muted",
      icon: <Minus size={15} />
    };
  }

  const isPositive = lowerIsBetter ? delta < 0 : delta > 0;
  return isPositive
    ? {
        className: "border-emerald/25 bg-emerald/10 text-emerald",
        textClassName: "text-emerald",
        icon: lowerIsBetter ? <TrendingDown size={15} /> : <TrendingUp size={15} />
      }
    : {
        className: "border-rose/25 bg-rose/10 text-rose",
        textClassName: "text-rose",
        icon: lowerIsBetter ? <TrendingUp size={15} /> : <TrendingDown size={15} />
      };
}

export function MonthlyComparisonPanel({
  comparison,
  t
}: {
  comparison: MonthlyComparison | null;
  t: (key: TranslationKey) => string;
}) {
  if (!comparison) {
    return null;
  }

  return (
    <Panel className="p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan">{t("monthlyComparisonEyebrow")}</p>
          <h2 className="mt-1 text-lg font-semibold text-text">{t("monthlyComparisonTitle")}</h2>
        </div>
        <p className="text-sm text-muted">
          {t("monthlyComparisonPrevious")}: {comparison.previous_month}/{comparison.previous_year}
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {metricConfigs.map((config) => {
          const metric = comparison[config.key];
          const tone = getTone(metric, config.lowerIsBetter);

          return (
            <div
              className="rounded-lg border border-borderSoft/80 bg-white/[0.025] p-2.5"
              key={config.key}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-muted">{t(config.labelKey)}</p>
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${tone.className}`}>
                  {tone.icon}
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold text-text">
                {formatMetricValue(metric.current, config.isCurrency)}
              </p>
              <p className={`mt-1 text-xs font-medium ${tone.textClassName}`}>
                {buildDeltaLabel(metric, config.isCurrency, t)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t("monthlyComparisonPreviousValue")}: {formatMetricValue(metric.previous, config.isCurrency)}
              </p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
