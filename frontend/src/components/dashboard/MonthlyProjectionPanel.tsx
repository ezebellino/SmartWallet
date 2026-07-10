import { ArrowRight, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatMoney } from "@/lib/format";
import type { MonthlyProjection } from "@/types/api";

function confidenceTone(confidence: string) {
  if (confidence === "high") {
    return "border-emerald/25 bg-emerald/10 text-emerald";
  }
  if (confidence === "medium") {
    return "border-amber/25 bg-amber/10 text-amber";
  }
  return "border-rose/25 bg-rose/10 text-rose";
}

export function MonthlyProjectionPanel({
  onReviewMovements,
  projection,
  t
}: {
  onReviewMovements: () => void;
  projection: MonthlyProjection | null;
  t: (key: TranslationKey) => string;
}) {
  if (!projection) {
    return null;
  }

  const projectedBalance = Number(projection.projected_net_balance);
  const dailyAverage = Number(projection.daily_net_average);
  const balanceTone = projectedBalance >= 0 ? "text-emerald" : "text-rose";
  const trendIcon =
    projectedBalance >= 0 ? <TrendingUp size={17} className="text-emerald" /> : <TrendingDown size={17} className="text-rose" />;

  return (
    <Panel className="p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan">{t("monthlyProjectionEyebrow")}</p>
          <h2 className="mt-1 text-lg font-semibold text-text">{t("monthlyProjectionTitle")}</h2>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold ${confidenceTone(projection.confidence)}`}>
          <Gauge size={14} />
          {t(`projectionConfidence${projection.confidence}` as TranslationKey)}
        </span>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_190px]">
        <div className="rounded-lg border border-borderSoft/80 bg-white/[0.025] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">{t("projectedEndBalance")}</p>
              <p className={`mt-2 text-2xl font-semibold leading-none ${balanceTone}`}>
                {formatMoney(projectedBalance)}
              </p>
            </div>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/5">{trendIcon}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            {t("monthlyProjectionBasedOn")} {projection.elapsed_days}/{projection.days_in_month} {t("monthDays").toLowerCase()}.
          </p>
        </div>

        <div className="grid gap-2">
          <div className="rounded-lg border border-borderSoft/80 bg-white/[0.025] p-2.5">
            <p className="text-xs text-muted">{t("projectedIncome")}</p>
            <p className="mt-1 text-sm font-semibold text-text">{formatMoney(Number(projection.projected_income))}</p>
          </div>
          <div className="rounded-lg border border-borderSoft/80 bg-white/[0.025] p-2.5">
            <p className="text-xs text-muted">{t("projectedExpenses")}</p>
            <p className="mt-1 text-sm font-semibold text-text">{formatMoney(Number(projection.projected_expense))}</p>
          </div>
          <div className="rounded-lg border border-borderSoft/80 bg-white/[0.025] p-2.5">
            <p className="text-xs text-muted">{t("dailyNetAverage")}</p>
            <p className="mt-1 text-sm font-semibold text-text">{formatMoney(dailyAverage)}</p>
          </div>
        </div>
      </div>

      <button
        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan transition hover:gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/25"
        onClick={onReviewMovements}
        type="button"
      >
        {t("monthlyProjectionAction")}
        <ArrowRight size={15} />
      </button>
    </Panel>
  );
}
