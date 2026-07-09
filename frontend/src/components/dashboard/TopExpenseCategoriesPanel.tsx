import { ArrowRight, Trophy } from "lucide-react";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatMoney } from "@/lib/format";

type TopExpenseCategory = {
  category_id: number;
  category_name: string;
  total: string;
  percentage: number;
};

const rankStyles = [
  "border-cyan/30 bg-cyan/10 text-cyan",
  "border-emerald/30 bg-emerald/10 text-emerald",
  "border-amber/30 bg-amber/10 text-amber"
];

export function TopExpenseCategoriesPanel({
  categories,
  onReviewMovements,
  t
}: {
  categories: TopExpenseCategory[];
  onReviewMovements: () => void;
  t: (key: TranslationKey) => string;
}) {
  const topCategories = categories
    .filter((category) => Number(category.total) > 0)
    .sort((left, right) => Number(right.total) - Number(left.total))
    .slice(0, 3);

  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan">{t("topExpenseCategoriesEyebrow")}</p>
          <h2 className="mt-1 text-lg font-semibold text-text">{t("topExpenseCategoriesTitle")}</h2>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-cyan/20 bg-cyan/10 text-cyan">
          <Trophy size={17} />
        </span>
      </div>

      {topCategories.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-borderSoft p-4 text-sm text-muted">
          {t("topExpenseCategoriesEmpty")}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {topCategories.map((category, index) => (
            <div className="rounded-lg border border-borderSoft/80 bg-white/[0.025] p-3" key={category.category_id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border text-xs font-bold ${rankStyles[index]}`}
                  >
                    {index + 1}
                  </span>
                  <p className="truncate text-sm font-semibold text-text">{category.category_name}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-text">{Math.round(category.percentage)}%</p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-cyan"
                  style={{ width: `${Math.min(Math.max(category.percentage, 0), 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-muted">{formatMoney(Number(category.total))}</p>
            </div>
          ))}
        </div>
      )}

      <button
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan transition hover:gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/25"
        onClick={onReviewMovements}
        type="button"
      >
        {t("topExpenseCategoriesAction")}
        <ArrowRight size={15} />
      </button>
    </Panel>
  );
}
