import { Banknote, CreditCard, Plus, ReceiptText, WalletCards, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { TranslationKey } from "@/i18n";
import { InlineCategoryCreator } from "@/components/dashboard/InlineCategoryCreator";
import type { Category, CategoryType, TransactionType } from "@/types/api";

type TransactionPayload = {
  category_id: number;
  type: TransactionType;
  amount: string;
  currency: string;
  description?: string;
  transaction_date: string;
};

type Props = {
  categories: Category[];
  isDisabled: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCreateCategory: (payload: { name: string; type: CategoryType; color: string; icon: string }) => Promise<Category | void>;
  onCreate: (payload: TransactionPayload) => Promise<void>;
  t: (key: TranslationKey) => string;
};

const today = new Date().toISOString().slice(0, 10);

const presets = [
  { currency: "ARS", icon: ReceiptText, key: "quickPresetExpense", type: "expense" },
  { currency: "ARS", icon: WalletCards, key: "quickPresetIncome", type: "income" },
  { currency: "ARS", icon: Banknote, key: "quickPresetUsd", type: "expense" }
] as const;

export function QuickTransactionPanel({ categories, isDisabled, isOpen, onClose, onCreate, onCreateCategory, t }: Props) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [transactionDate, setTransactionDate] = useState(today);
  const [type, setType] = useState<TransactionType>("expense");
  const [usdQuantity, setUsdQuantity] = useState("");

  const availableCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function resetForm() {
    setAmount("");
    setCategoryId("");
    setCurrency("ARS");
    setDescription("");
    setTransactionDate(today);
    setType("expense");
    setUsdQuantity("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
        amount,
        category_id: selectedCategoryId,
        currency,
        description: finalDescription || undefined,
        transaction_date: transactionDate,
        type
      });
      resetForm();
      onClose();
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/72 px-3 py-4 backdrop-blur-sm sm:items-center">
      <button className="absolute inset-0 cursor-default" onClick={onClose} type="button" aria-label={t("quickClosePanel")} />
      <section className="relative z-10 w-full max-w-2xl rounded-lg border border-borderSoft/90 bg-panel p-4 shadow-2xl ring-1 ring-white/[0.035]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan">{t("quickTransactionEyebrow")}</p>
            <h2 className="mt-1 text-lg font-semibold text-text">{t("quickTransactionTitle")}</h2>
            <p className="mt-1 text-sm leading-5 text-muted">{t("quickTransactionSubtitle")}</p>
          </div>
          <button
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-borderSoft text-muted transition hover:bg-panelSoft hover:text-text"
            onClick={onClose}
            type="button"
            aria-label={t("quickClosePanel")}
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {presets.map((preset) => {
            const Icon = preset.icon;
            const isActive = type === preset.type && currency === preset.currency && (preset.key !== "quickPresetUsd" || usdQuantity);

            return (
              <button
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold transition ${
                  isActive ? "border-cyan/40 bg-cyan/12 text-cyan" : "border-borderSoft bg-background/55 text-muted hover:text-text"
                }`}
                disabled={isDisabled || isSaving}
                key={preset.key}
                onClick={() => {
                  setType(preset.type);
                  setCurrency(preset.currency);
                  setCategoryId("");
                  if (preset.key !== "quickPresetUsd") {
                    setUsdQuantity("");
                  }
                }}
                type="button"
              >
                <Icon size={16} />
                {t(preset.key)}
              </button>
            );
          })}
        </div>

        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_150px]">
            <input
              className="h-11 rounded-md border border-borderSoft bg-background px-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
              disabled={isDisabled || isSaving}
              min="0"
              onChange={(event) => setAmount(event.target.value)}
              placeholder={t("amount")}
              step="0.01"
              type="number"
              value={amount}
            />
            <select
              className="h-11 rounded-md border border-borderSoft bg-background px-3 text-sm text-text outline-none transition focus:border-cyan"
              disabled={isDisabled || isSaving}
              onChange={(event) => {
                setCurrency(event.target.value);
                if (event.target.value !== "ARS") {
                  setUsdQuantity("");
                }
              }}
              value={currency}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
            <input
              className="h-11 rounded-md border border-borderSoft bg-background px-3 text-sm text-text outline-none transition focus:border-cyan"
              disabled={isDisabled || isSaving}
              onChange={(event) => setTransactionDate(event.target.value)}
              type="date"
              value={transactionDate}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
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
                    if (option === "income") {
                      setUsdQuantity("");
                    }
                  }}
                  type="button"
                >
                  {t(option === "expense" ? "expenseType" : "incomeType")}
                </button>
              ))}
            </div>

            <select
              className="h-11 rounded-md border border-borderSoft bg-background px-3 text-sm text-text outline-none transition focus:border-cyan"
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
          </div>

          <InlineCategoryCreator
            isDisabled={isDisabled || isSaving}
            onCreate={onCreateCategory}
            onCreated={(category) => setCategoryId(String(category.id))}
            t={t}
            type={type}
          />

          {type === "expense" && currency === "ARS" ? (
            <div className="rounded-md border border-cyan/20 bg-cyan/8 p-3">
              <label className="text-xs font-semibold uppercase text-cyan" htmlFor="quick-usd-quantity">
                {t("usdPurchasedQuantity")}
              </label>
              <input
                className="mt-2 h-10 w-full rounded-md border border-borderSoft bg-background px-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
                disabled={isDisabled || isSaving}
                id="quick-usd-quantity"
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

          <input
            className="h-11 rounded-md border border-borderSoft bg-background px-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
            disabled={isDisabled || isSaving}
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("descriptionOptional")}
            value={description}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border border-borderSoft px-4 text-sm font-semibold text-muted transition hover:bg-panelSoft hover:text-text"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              {t("cancel")}
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan px-4 text-sm font-semibold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isDisabled || isSaving || availableCategories.length === 0 || !amount}
              type="submit"
            >
              <Plus size={16} />
              {isSaving ? t("saving") : t("quickSaveMovement")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
