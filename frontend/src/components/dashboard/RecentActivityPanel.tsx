import { ArrowRight, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { TranslationKey, Language } from "@/i18n";
import type { Category, Transaction } from "@/types/api";
import { Panel } from "@/components/ui";

export function RecentActivityPanel({
  categories,
  language,
  month,
  onReviewMovements,
  t,
  transactions,
  year
}: {
  categories: Category[];
  language: Language;
  month: number;
  onReviewMovements: () => void;
  t: (key: TranslationKey) => string;
  transactions: Transaction[];
  year: number;
}) {
  const period = `${year}-${String(month).padStart(2, "0")}-`;
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const recent = transactions
    .filter((transaction) => transaction.transaction_date.startsWith(period))
    .sort((left, right) =>
      right.transaction_date.localeCompare(left.transaction_date) ||
      right.created_at.localeCompare(left.created_at) ||
      right.id - left.id
    )
    .slice(0, 6);
  const locale = language === "es" ? "es-AR" : "en-US";

  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text">{t("recentActivity")}</h2>
        <button className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-cyan hover:text-text" onClick={onReviewMovements} type="button">
          {t("viewMovements")} <ArrowRight size={15} />
        </button>
      </div>
      {recent.length === 0 ? (
        <p className="mt-4 border-t border-borderSoft pt-4 text-sm text-muted">{t("noMonthlyData")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-borderSoft">
          {recent.map((transaction) => {
            const isIncome = transaction.type === "income";
            const label = transaction.description?.trim() || categoryNames.get(transaction.category_id) || t("uncategorized");
            const amount = Number(transaction.amount).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${transaction.transaction_date}T00:00:00`));
            return (
              <li className="flex min-w-0 items-center gap-3 py-3" key={transaction.id}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${isIncome ? "bg-emerald/10 text-emerald" : "bg-rose/10 text-rose"}`}>
                  {isIncome ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text" title={label}>{label}</p>
                  <p className="text-xs text-muted">{categoryNames.get(transaction.category_id) || t("uncategorized")} · {date}</p>
                </div>
                <span className={`shrink-0 text-right text-sm font-semibold tabular-nums ${isIncome ? "text-emerald" : "text-text"}`}>
                  {isIncome ? "+" : "-"}{transaction.currency} {amount}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
