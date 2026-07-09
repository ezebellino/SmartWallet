import { CalendarDays, Check, Copy, CreditCard, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { InlineCategoryCreator } from "@/components/dashboard/InlineCategoryCreator";
import { confirmAction } from "@/lib/alerts";
import { formatDate, formatMoney } from "@/lib/format";
import type { Category, CategoryType, Transaction, TransactionType } from "@/types/api";

type TransactionPayload = {
  category_id: number;
  type: TransactionType;
  amount: string;
  currency: string;
  description?: string;
  transaction_date: string;
};

type TransactionUpdatePayload = {
  category_id?: number;
  amount?: string;
  currency?: string;
  description?: string | null;
  transaction_date?: string;
};

type Props = {
  categories: Category[];
  isDisabled: boolean;
  onCreateCategory: (payload: { name: string; type: CategoryType; color: string; icon: string }) => Promise<Category | void>;
  onCreate: (payload: TransactionPayload) => Promise<void>;
  onDelete: (transactionId: number) => Promise<void>;
  onUpdate: (transactionId: number, payload: TransactionUpdatePayload) => Promise<void>;
  transactions: Transaction[];
  t: (key: TranslationKey) => string;
};

const today = new Date().toISOString().slice(0, 10);
const initialVisibleCount = 8;
const dayMs = 24 * 60 * 60 * 1000;
const yesterday = new Date(Date.now() - dayMs).toISOString().slice(0, 10);
const lastWeek = new Date(Date.now() - dayMs * 6).toISOString().slice(0, 10);
const movementGroupOrder = ["today", "yesterday", "week", "older"] as const;
type MovementGroupKey = (typeof movementGroupOrder)[number];

function getMovementGroupKey(date: string): MovementGroupKey {
  if (date === today) {
    return "today";
  }

  if (date === yesterday) {
    return "yesterday";
  }

  if (date >= lastWeek) {
    return "week";
  }

  return "older";
}

function getMovementGroupLabel(key: MovementGroupKey): TranslationKey {
  return {
    older: "movementGroupOlder",
    today: "movementGroupToday",
    week: "movementGroupThisWeek",
    yesterday: "movementGroupYesterday"
  }[key] as TranslationKey;
}

export function TransactionManager({ categories, isDisabled, onCreate, onCreateCategory, onDelete, onUpdate, transactions, t }: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [description, setDescription] = useState("");
  const [usdQuantity, setUsdQuantity] = useState("");
  const [transactionDate, setTransactionDate] = useState(today);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingAmount, setEditingAmount] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingDate, setEditingDate] = useState(today);
  const [filterType, setFilterType] = useState<TransactionType | "all">("all");
  const [filterCategoryId, setFilterCategoryId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [isSaving, setIsSaving] = useState(false);

  const availableCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type]
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );
  const filteredTransactions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const category = categoryById.get(transaction.category_id);
      const matchesType = filterType === "all" || transaction.type === filterType;
      const matchesCategory = filterCategoryId === "all" || transaction.category_id === Number(filterCategoryId);
      const searchableText = `${transaction.description ?? ""} ${category?.name ?? ""}`.toLowerCase();
      const matchesSearch = !normalizedQuery || searchableText.includes(normalizedQuery);

      return matchesType && matchesCategory && matchesSearch;
    });
  }, [categoryById, filterCategoryId, filterType, searchQuery, transactions]);
  const filteredTotals = useMemo(
    () =>
      filteredTransactions.reduce(
        (totals, transaction) => {
          const amountValue = Number(transaction.amount);
          if (transaction.type === "income") {
            return { ...totals, income: totals.income + amountValue };
          }

          return { ...totals, expenses: totals.expenses + amountValue };
        },
        { income: 0, expenses: 0 }
      ),
    [filteredTransactions]
  );
  const visibleTransactions = filteredTransactions.slice(0, visibleCount);
  const groupedVisibleTransactions = useMemo(() => {
    const groups = new Map<
      MovementGroupKey,
      { expenses: number; income: number; items: Transaction[]; key: MovementGroupKey }
    >();

    for (const transaction of visibleTransactions) {
      const groupKey = getMovementGroupKey(transaction.transaction_date);
      const current = groups.get(groupKey) ?? { expenses: 0, income: 0, items: [], key: groupKey };
      const amountValue = Number(transaction.amount);

      current.items.push(transaction);
      if (transaction.type === "income") {
        current.income += amountValue;
      } else {
        current.expenses += amountValue;
      }

      groups.set(groupKey, current);
    }

    return movementGroupOrder.map((key) => groups.get(key)).filter(Boolean) as Array<{
      expenses: number;
      income: number;
      items: Transaction[];
      key: MovementGroupKey;
    }>;
  }, [visibleTransactions]);
  const filteredNet = filteredTotals.income - filteredTotals.expenses;

  function resetFilters() {
    setFilterType("all");
    setFilterCategoryId("all");
    setSearchQuery("");
    setVisibleCount(initialVisibleCount);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedCategoryId = Number(categoryId || availableCategories[0]?.id);
    if (!selectedCategoryId || !amount) {
      return;
    }

    setIsSaving(true);
    try {
      const normalizedDescription = description.trim();
      const finalDescription =
        type === "expense" && currency === "ARS" && usdQuantity
          ? `Compra USD ${usdQuantity}${normalizedDescription ? ` - ${normalizedDescription}` : ""}`
          : normalizedDescription;

      await onCreate({
        category_id: selectedCategoryId,
        type,
        amount,
        currency,
        description: finalDescription || undefined,
        transaction_date: transactionDate
      });
      setAmount("");
      setCurrency("ARS");
      setDescription("");
      setUsdQuantity("");
      setCategoryId("");
      setTransactionDate(today);
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(transaction: Transaction) {
    setEditingId(transaction.id);
    setEditingCategoryId(String(transaction.category_id));
    setEditingAmount(transaction.amount);
    setEditingDescription(transaction.description ?? "");
    setEditingDate(transaction.transaction_date);
  }

  async function handleUpdate(transaction: Transaction) {
    const selectedCategoryId = Number(editingCategoryId);
    if (!selectedCategoryId || !editingAmount) {
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(transaction.id, {
        category_id: selectedCategoryId,
        amount: editingAmount,
        currency: transaction.currency,
        description: editingDescription.trim() || null,
        transaction_date: editingDate
      });
      setEditingId(null);
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDuplicate(transaction: Transaction) {
    setIsSaving(true);
    try {
      await onCreate({
        amount: transaction.amount,
        category_id: transaction.category_id,
        currency: transaction.currency,
        description: transaction.description ?? undefined,
        transaction_date: today,
        type: transaction.type
      });
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(transaction: Transaction) {
    const confirmed = await confirmAction({
      cancelText: t("cancel"),
      confirmText: t("delete"),
      title: t("confirmDeleteMovement")
    });

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    try {
      await onDelete(transaction.id);
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
          <h2 className="text-base font-semibold text-text">{t("realMovements")}</h2>
          <p className="mt-1 text-sm text-muted">{t("realMovementsSubtitle")}</p>
        </div>
        <CreditCard size={18} className="text-emerald" />
      </div>

      <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 rounded-md border border-borderSoft bg-background p-1">
          {(["expense", "income"] as const).map((option) => (
            <button
              className={`rounded px-3 py-2 text-sm font-medium transition ${
                type === option ? "bg-panelSoft text-text" : "text-muted hover:text-text"
              }`}
              disabled={isDisabled || isSaving}
              key={option}
              onClick={() => {
                setType(option);
                setCategoryId("");
              }}
              type="button"
            >
              {t(option === "expense" ? "expenseType" : "incomeType")}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
            disabled={isDisabled || isSaving}
            min="0"
            onChange={(event) => setAmount(event.target.value)}
            placeholder={t("amount")}
            step="0.01"
            type="number"
            value={amount}
          />
          <select
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition focus:border-cyan"
            disabled={isDisabled || isSaving}
            onChange={(event) => setCurrency(event.target.value)}
            value={currency}
          >
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
          <input
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition focus:border-cyan"
            disabled={isDisabled || isSaving}
            onChange={(event) => setTransactionDate(event.target.value)}
            type="date"
            value={transactionDate}
          />
        </div>

        {type === "expense" && currency === "ARS" ? (
          <div className="rounded-md border border-cyan/20 bg-cyan/8 p-3">
            <label className="text-xs font-semibold uppercase text-cyan" htmlFor="usd-quantity">
              {t("usdPurchasedQuantity")}
            </label>
            <input
              className="mt-2 h-10 w-full rounded-md border border-borderSoft bg-background px-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
              disabled={isDisabled || isSaving}
              id="usd-quantity"
              inputMode="decimal"
              min="0"
              onChange={(event) => setUsdQuantity(event.target.value)}
              placeholder="100"
              step="0.01"
              type="number"
              value={usdQuantity}
            />
            <p className="mt-2 text-xs leading-5 text-muted">{t("usdPurchasedQuantityHint")}</p>
          </div>
        ) : null}

        <select
          className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition focus:border-cyan"
          disabled={isDisabled || isSaving || availableCategories.length === 0}
          onChange={(event) => setCategoryId(event.target.value)}
          value={categoryId || availableCategories[0]?.id || ""}
        >
          {availableCategories.length === 0 ? (
            <option value="">{t("createCategoryFirst")}</option>
          ) : (
            availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))
          )}
        </select>

        <InlineCategoryCreator
          isDisabled={isDisabled || isSaving}
          onCreate={onCreateCategory}
          onCreated={(category) => setCategoryId(String(category.id))}
          t={t}
          type={type}
        />

        <input
          className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
          disabled={isDisabled || isSaving}
          maxLength={500}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("descriptionOptional")}
          value={description}
        />

        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan px-4 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isDisabled || isSaving || availableCategories.length === 0 || !amount}
          type="submit"
        >
          <Plus size={16} />
          {isSaving ? t("saving") : t("addMovement")}
        </button>
      </form>

      <div className="mt-5 rounded-md border border-borderSoft bg-background p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-text">
          <Search size={15} className="text-cyan" />
          {t("movementFilters")}
        </div>
        <div className="mt-3 grid gap-3">
          <input
            className="rounded-md border border-borderSoft bg-panel px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setVisibleCount(initialVisibleCount);
            }}
            placeholder={t("searchMovements")}
            value={searchQuery}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="rounded-md border border-borderSoft bg-panel px-3 py-2.5 text-sm text-text outline-none transition focus:border-cyan"
              onChange={(event) => {
                setFilterType(event.target.value as TransactionType | "all");
                setFilterCategoryId("all");
                setVisibleCount(initialVisibleCount);
              }}
              value={filterType}
            >
              <option value="all">{t("allTypes")}</option>
              <option value="expense">{t("expenseType")}</option>
              <option value="income">{t("incomeType")}</option>
            </select>
            <select
              className="rounded-md border border-borderSoft bg-panel px-3 py-2.5 text-sm text-text outline-none transition focus:border-cyan"
              onChange={(event) => {
                setFilterCategoryId(event.target.value);
                setVisibleCount(initialVisibleCount);
              }}
              value={filterCategoryId}
            >
              <option value="all">{t("allCategories")}</option>
              {categories
                .filter((category) => filterType === "all" || category.type === filterType)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid gap-2 text-sm xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted">{t("filteredSummary")}</div>
              <div className="grid gap-2 sm:grid-cols-4">
                <span className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-muted">
                  {filteredTransactions.length} {t("results")}
                </span>
                <span className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-emerald">
                  {formatMoney(filteredTotals.income)}
                </span>
                <span className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-rose">
                  {formatMoney(filteredTotals.expenses)}
                </span>
                <span className={filteredNet >= 0 ? "rounded-md border border-emerald/25 bg-emerald/10 px-3 py-2 text-emerald" : "rounded-md border border-rose/25 bg-rose/10 px-3 py-2 text-rose"}>
                  {formatMoney(filteredNet)}
                </span>
              </div>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-borderSoft px-3 py-2 text-sm font-medium text-muted transition hover:text-text"
              onClick={resetFilters}
              type="button"
            >
              <RotateCcw size={14} />
              {t("clearFilters")}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {transactions.length === 0 ? (
          <p className="rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
            {t(isDisabled ? "signInToManageData" : "noMovements")}
          </p>
        ) : filteredTransactions.length === 0 ? (
          <p className="rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
            {t("noFilteredMovements")}
          </p>
        ) : (
          groupedVisibleTransactions.map((group) => {
            const groupNet = group.income - group.expenses;

            return (
              <section className="space-y-2" key={group.key}>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-borderSoft/80 bg-panel/70 px-3 py-2">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                    <CalendarDays size={15} className="text-cyan" />
                    {t(getMovementGroupLabel(group.key))}
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">{group.items.length}</span>
                  </div>
                  <div className={groupNet >= 0 ? "text-sm font-semibold text-emerald" : "text-sm font-semibold text-rose"}>
                    {formatMoney(groupNet)}
                  </div>
                </div>
                {group.items.map((transaction) => {
                  const category = categoryById.get(transaction.category_id);
                  const amountValue = Number(transaction.amount);
                  const signedAmount = transaction.type === "income" ? amountValue : -amountValue;
                  const editableCategories = categories.filter((item) => item.type === transaction.type);

                  return (
                    <div className="rounded-md border border-borderSoft bg-background px-3 py-2.5" key={transaction.id}>
                      {editingId === transaction.id ? (
                        <div className="grid gap-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input
                              className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                              disabled={isDisabled || isSaving}
                              min="0"
                              onChange={(event) => setEditingAmount(event.target.value)}
                              step="0.01"
                              type="number"
                              value={editingAmount}
                            />
                            <input
                              className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                              disabled={isDisabled || isSaving}
                              onChange={(event) => setEditingDate(event.target.value)}
                              type="date"
                              value={editingDate}
                            />
                          </div>
                          <select
                            className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                            disabled={isDisabled || isSaving}
                            onChange={(event) => setEditingCategoryId(event.target.value)}
                            value={editingCategoryId}
                          >
                            {editableCategories.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                          <input
                            className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
                            disabled={isDisabled || isSaving}
                            maxLength={500}
                            onChange={(event) => setEditingDescription(event.target.value)}
                            placeholder={t("descriptionOptional")}
                            value={editingDescription}
                          />
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
                              disabled={isSaving || !editingAmount || !editingCategoryId}
                              onClick={() => void handleUpdate(transaction)}
                              title={t("saveChanges")}
                              type="button"
                            >
                              <Check size={15} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-text">
                              {transaction.description || category?.name || t("uncategorized")}
                            </div>
                            <div className="mt-1 text-xs text-muted">
                              {category?.name || t("uncategorized")} - {formatDate(transaction.transaction_date)}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <div className={transaction.type === "income" ? "text-sm font-semibold text-emerald" : "text-sm font-semibold text-rose"}>
                              {formatMoney(signedAmount)}
                            </div>
                            <button
                              className="grid h-8 w-8 place-items-center rounded-md border border-borderSoft text-muted transition hover:text-text"
                              disabled={isDisabled || isSaving}
                              onClick={() => startEditing(transaction)}
                              title={t("edit")}
                              type="button"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="grid h-8 w-8 place-items-center rounded-md border border-borderSoft text-muted transition hover:border-cyan hover:text-cyan"
                              disabled={isDisabled || isSaving}
                              onClick={() => void handleDuplicate(transaction)}
                              title={t("duplicateMovement")}
                              type="button"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              className="grid h-8 w-8 place-items-center rounded-md border border-borderSoft text-muted transition hover:border-rose hover:text-rose"
                              disabled={isDisabled || isSaving}
                              onClick={() => void handleDelete(transaction)}
                              title={t("delete")}
                              type="button"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })
        )}
      </div>
      {visibleTransactions.length < filteredTransactions.length ? (
        <button
          className="mt-3 w-full rounded-md border border-borderSoft px-3 py-2.5 text-sm font-medium text-muted transition hover:text-text"
          onClick={() => setVisibleCount((current) => current + initialVisibleCount)}
          type="button"
        >
          {t("showMoreMovements")}
        </button>
      ) : null}
    </Panel>
  );
}
