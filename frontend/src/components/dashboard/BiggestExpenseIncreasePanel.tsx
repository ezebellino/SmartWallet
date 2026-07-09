import { AlertTriangle, ArrowRight, TrendingUp } from "lucide-react";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatMoney } from "@/lib/format";
import type { CategoryExpenseIncrease } from "@/types/api";

export function BiggestExpenseIncreasePanel({
  increase,
  onReviewMovements,
  t
}: {
  increase: CategoryExpenseIncrease | null;
  onReviewMovements: () => void;
  t: (key: TranslationKey) => string;
}) {
  const category = increase?.category ?? null;

  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-amber">{t("biggestExpenseIncreaseEyebrow")}</p>
          <h2 className="mt-1 text-lg font-semibold text-text">{t("biggestExpenseIncreaseTitle")}</h2>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-amber/25 bg-amber/10 text-amber">
          <TrendingUp size={17} />
        </span>
      </div>

      {!category ? (
        <div className="mt-4 rounded-lg border border-dashed border-borderSoft p-4 text-sm text-muted">
          {t("biggestExpenseIncreaseEmpty")}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-amber/20 bg-amber/10 p-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-amber/15 text-amber">
              <AlertTriangle size={16} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-text">{category.category_name}</p>
              <p className="mt-1 text-sm font-medium text-amber">
                +{formatMoney(Number(category.delta))}
                {category.delta_percentage === null ? "" : ` (${category.delta_percentage.toFixed(1)}%)`}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-borderSoft/70 bg-background/35 p-2">
              <p className="text-xs text-muted">{t("biggestExpenseIncreaseCurrent")}</p>
              <p className="mt-1 text-sm font-semibold text-text">{formatMoney(Number(category.current_total))}</p>
            </div>
            <div className="rounded-md border border-borderSoft/70 bg-background/35 p-2">
              <p className="text-xs text-muted">{t("biggestExpenseIncreasePrevious")}</p>
              <p className="mt-1 text-sm font-semibold text-text">{formatMoney(Number(category.previous_total))}</p>
            </div>
          </div>
        </div>
      )}

      <button
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan transition hover:gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/25"
        onClick={onReviewMovements}
        type="button"
      >
        {t("biggestExpenseIncreaseAction")}
        <ArrowRight size={15} />
      </button>
    </Panel>
  );
}
