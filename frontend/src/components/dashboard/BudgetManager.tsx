import { Check, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Panel, ProgressBar } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatMoney } from "@/lib/format";
import type { Budget, BudgetUsage, Category } from "@/types/api";

type BudgetPayload = {
  category_id: number;
  year: number;
  month: number;
  limit_amount: string;
  alert_threshold_percentage: number;
};

type Props = {
  budgets: Budget[];
  budgetUsage: BudgetUsage[];
  categories: Category[];
  currentMonth: number;
  currentYear: number;
  isDisabled: boolean;
  onCreate: (payload: BudgetPayload) => Promise<void>;
  onDelete: (budgetId: number) => Promise<void>;
  onUpdate: (budgetId: number, payload: { limit_amount?: string; alert_threshold_percentage?: number }) => Promise<void>;
  t: (key: TranslationKey) => string;
};

export function BudgetManager({
  budgets,
  budgetUsage,
  categories,
  currentMonth,
  currentYear,
  isDisabled,
  onCreate,
  onDelete,
  onUpdate,
  t
}: Props) {
  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === "expense"),
    [categories]
  );
  const budgetedCategoryIds = useMemo(() => new Set(budgets.map((budget) => budget.category_id)), [budgets]);
  const availableCategories = expenseCategories.filter((category) => !budgetedCategoryIds.has(category.id));
  const usageByBudgetId = useMemo(
    () => new Map(budgetUsage.map((usage) => [usage.budget_id, usage])),
    [budgetUsage]
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const [categoryId, setCategoryId] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [threshold, setThreshold] = useState("80");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLimit, setEditingLimit] = useState("");
  const [editingThreshold, setEditingThreshold] = useState("80");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedCategoryId = Number(categoryId || availableCategories[0]?.id);
    if (!selectedCategoryId || !limitAmount) {
      return;
    }

    setIsSaving(true);
    try {
      await onCreate({
        category_id: selectedCategoryId,
        year: currentYear,
        month: currentMonth,
        limit_amount: limitAmount,
        alert_threshold_percentage: Number(threshold)
      });
      setCategoryId("");
      setLimitAmount("");
      setThreshold("80");
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(budget: Budget) {
    setEditingId(budget.id);
    setEditingLimit(budget.limit_amount);
    setEditingThreshold(String(budget.alert_threshold_percentage));
  }

  async function handleUpdate(budget: Budget) {
    if (!editingLimit) {
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(budget.id, {
        limit_amount: editingLimit,
        alert_threshold_percentage: Number(editingThreshold)
      });
      setEditingId(null);
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(budget: Budget) {
    if (!confirm(t("confirmDeleteBudget"))) {
      return;
    }

    setIsSaving(true);
    try {
      await onDelete(budget.id);
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text">{t("realBudgets")}</h2>
          <p className="mt-1 text-sm text-muted">{t("realBudgetsSubtitle")}</p>
        </div>
        <Target size={18} className="text-amber" />
      </div>

      <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
        <select
          className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition focus:border-cyan"
          disabled={isDisabled || isSaving || availableCategories.length === 0}
          onChange={(event) => setCategoryId(event.target.value)}
          value={categoryId || availableCategories[0]?.id || ""}
        >
          {availableCategories.length === 0 ? (
            <option value="">{t("createExpenseCategoryFirst")}</option>
          ) : (
            availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))
          )}
        </select>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
            disabled={isDisabled || isSaving}
            min="0"
            onChange={(event) => setLimitAmount(event.target.value)}
            placeholder={t("budgetLimit")}
            step="0.01"
            type="number"
            value={limitAmount}
          />
          <input
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
            disabled={isDisabled || isSaving}
            max="100"
            min="1"
            onChange={(event) => setThreshold(event.target.value)}
            placeholder={t("alertThreshold")}
            type="number"
            value={threshold}
          />
        </div>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isDisabled || isSaving || availableCategories.length === 0 || !limitAmount}
          type="submit"
        >
          <Plus size={16} />
          {isSaving ? t("saving") : t("addBudget")}
        </button>
      </form>

      <div className="mt-5 space-y-2">
        {budgets.length === 0 ? (
          <p className="rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
            {t(isDisabled ? "signInToManageData" : "noBudgets")}
          </p>
        ) : (
          budgets.map((budget) => {
            const usage = usageByBudgetId.get(budget.id);
            const category = categoryById.get(budget.category_id);
            const percentage = usage?.usage_percentage ?? 0;
            const tone = usage?.is_over_budget ? "rose" : usage?.is_near_limit ? "amber" : "emerald";

            return (
              <div className="rounded-md border border-borderSoft bg-background px-3 py-2.5" key={budget.id}>
                {editingId === budget.id ? (
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                        disabled={isDisabled || isSaving}
                        min="0"
                        onChange={(event) => setEditingLimit(event.target.value)}
                        step="0.01"
                        type="number"
                        value={editingLimit}
                      />
                      <input
                        className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                        disabled={isDisabled || isSaving}
                        max="100"
                        min="1"
                        onChange={(event) => setEditingThreshold(event.target.value)}
                        type="number"
                        value={editingThreshold}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="grid h-8 w-8 place-items-center rounded-md border border-borderSoft text-muted transition hover:text-text"
                        disabled={isSaving}
                        onClick={() => setEditingId(null)}
                        title={t("cancel")}
                        type="button"
                      >
                        <X size={15} />
                      </button>
                      <button
                        className="grid h-8 w-8 place-items-center rounded-md bg-emerald text-background transition hover:brightness-110 disabled:opacity-55"
                        disabled={isSaving || !editingLimit}
                        onClick={() => void handleUpdate(budget)}
                        title={t("saveChanges")}
                        type="button"
                      >
                        <Check size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-text">
                          {usage?.category_name || category?.name || t("uncategorized")}
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          {formatMoney(Number(usage?.spent_amount ?? 0))} / {formatMoney(Number(budget.limit_amount))}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={tone === "rose" ? "text-xs font-semibold text-rose" : tone === "amber" ? "text-xs font-semibold text-amber" : "text-xs font-semibold text-emerald"}>
                          {Math.round(percentage)}%
                        </span>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-md border border-borderSoft text-muted transition hover:text-text"
                          disabled={isDisabled || isSaving}
                          onClick={() => startEditing(budget)}
                          title={t("edit")}
                          type="button"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-md border border-borderSoft text-muted transition hover:border-rose hover:text-rose"
                          disabled={isDisabled || isSaving}
                          onClick={() => void handleDelete(budget)}
                          title={t("delete")}
                          type="button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <ProgressBar value={percentage} tone={tone} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Panel>
  );
}
