import { useMemo, useState } from "react";
import { Banknote, Landmark, PencilLine, ReceiptText, Trash2, WalletCards } from "lucide-react";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatDate } from "@/lib/format";
import type { Category, DollarSaving, DollarSavingSource, Transaction } from "@/types/api";

type DollarMovement = {
  categoryName: string;
  date: string;
  description: string;
  id: number;
  source: "currency" | "text";
  usdAmount: number;
};

export type DollarSavingsSnapshot = {
  detectedMovements: DollarMovement[];
  manualAmount: number;
  totalPurchased: number;
  totalUsd: number;
};

const dollarTextPattern = /\b(usd|u\$s|dolar|dolares|dólar|dólares)\b/i;
const usdAmountPattern = /(?:usd|u\$s|dolares|dólares|dolar|dólar)\s*([0-9]+(?:[.,][0-9]+)?)|([0-9]+(?:[.,][0-9]+)?)\s*(?:usd|u\$s|dolares|dólares|dolar|dólar)/i;

function parseNumber(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseUsdAmountFromText(value: string | null) {
  if (!value) {
    return 0;
  }

  const match = value.match(usdAmountPattern);
  return parseNumber(match?.[1] ?? match?.[2] ?? "");
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("es-AR", {
    currency: "USD",
    maximumFractionDigits: 2,
    style: "currency"
  }).format(value);
}

export function buildDollarSavingsSnapshot({
  categories,
  manualAmount,
  transactions
}: {
  categories: Category[];
  manualAmount: number;
  transactions: Transaction[];
}): DollarSavingsSnapshot {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const detectedMovements = transactions
    .map((transaction) => {
      const categoryName = categoryById.get(transaction.category_id)?.name ?? "";
      const searchText = `${categoryName} ${transaction.description ?? ""}`;
      const isUsdCurrency = transaction.currency.toUpperCase() === "USD";
      const isDollarText = dollarTextPattern.test(searchText);

      if (!isUsdCurrency && !isDollarText) {
        return null;
      }

      return {
        categoryName,
        date: transaction.transaction_date,
        description: transaction.description ?? "",
        id: transaction.id,
        source: isUsdCurrency ? ("currency" as const) : ("text" as const),
        usdAmount: isUsdCurrency ? Number(transaction.amount) : parseUsdAmountFromText(transaction.description)
      };
    })
    .filter((movement): movement is DollarMovement => Boolean(movement))
    .sort((left, right) => right.date.localeCompare(left.date));

  const totalPurchased = detectedMovements.reduce((total, movement) => total + movement.usdAmount, 0);

  return {
    detectedMovements,
    manualAmount,
    totalPurchased,
    totalUsd: manualAmount + totalPurchased
  };
}

export function DollarSavingsManager({
  categories,
  dollarSavings,
  isDisabled,
  onCreate,
  onDelete,
  onUpdate,
  t,
  transactions
}: {
  categories: Category[];
  dollarSavings: DollarSaving[];
  isDisabled: boolean;
  onCreate: (payload: { amount: string; source: DollarSavingSource; notes?: string | null; saved_at?: string | null }) => Promise<void>;
  onDelete: (dollarSavingId: number) => Promise<void>;
  onUpdate: (
    dollarSavingId: number,
    payload: { amount?: string; source?: DollarSavingSource; notes?: string | null; saved_at?: string | null }
  ) => Promise<void>;
  t: (key: TranslationKey) => string;
  transactions: Transaction[];
}) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<DollarSavingSource>("manual");
  const [notes, setNotes] = useState("");
  const [savedAt, setSavedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const manualAmount = useMemo(
    () => dollarSavings.reduce((total, saving) => total + Number(saving.amount), 0),
    [dollarSavings]
  );

  const snapshot = useMemo(
    () =>
      buildDollarSavingsSnapshot({
        categories,
        manualAmount,
        transactions
      }),
    [categories, manualAmount, transactions]
  );

  function resetForm() {
    setAmount("");
    setSource("manual");
    setNotes("");
    setSavedAt(new Date().toISOString().slice(0, 10));
    setEditingId(null);
  }

  function startEditing(saving: DollarSaving) {
    setEditingId(saving.id);
    setAmount(saving.amount);
    setSource(saving.source);
    setNotes(saving.notes ?? "");
    setSavedAt(saving.saved_at ?? new Date().toISOString().slice(0, 10));
  }

  async function handleSubmit() {
    const parsedAmount = parseNumber(amount);
    if (parsedAmount <= 0) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        amount: String(parsedAmount),
        notes: notes.trim() || null,
        saved_at: savedAt || null,
        source
      };

      if (editingId) {
        await onUpdate(editingId, payload);
      } else {
        await onCreate(payload);
      }

      resetForm();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <Panel className="overflow-hidden p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-cyan">{t("dollarSavingsLabel")}</p>
              <h2 className="mt-1 text-xl font-semibold text-text">{formatUsd(snapshot.totalUsd)}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{t("dollarSavingsSubtitle")}</p>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-emerald/25 bg-emerald/10 text-emerald">
              <WalletCards size={22} />
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-borderSoft bg-background/62 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald">
                <Landmark size={16} />
                {t("manualDollarStock")}
              </div>
              <div className="mt-3 text-lg font-semibold text-text">{formatUsd(snapshot.manualAmount)}</div>
            </div>
            <div className="rounded-md border border-borderSoft bg-background/62 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan">
                <ReceiptText size={16} />
                {t("detectedDollarPurchases")}
              </div>
              <div className="mt-3 text-lg font-semibold text-text">{formatUsd(snapshot.totalPurchased)}</div>
            </div>
            <div className="rounded-md border border-borderSoft bg-background/62 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber">
                <Banknote size={16} />
                {t("detectedMovements")}
              </div>
              <div className="mt-3 text-lg font-semibold text-text">{snapshot.detectedMovements.length}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-text">{t("dollarMovementsTitle")}</h3>
              <p className="mt-1 text-sm text-muted">{t("dollarMovementsSubtitle")}</p>
            </div>
          </div>

          {snapshot.detectedMovements.length === 0 ? (
            <div className="mt-4 rounded-md border border-dashed border-borderSoft bg-background/55 p-4 text-sm leading-6 text-muted">
              {t("noDollarMovements")}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {snapshot.detectedMovements.map((movement) => (
                <div
                  className="grid gap-3 rounded-md border border-borderSoft bg-background/62 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={movement.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-text">
                        {movement.categoryName || t("uncategorized")}
                      </span>
                      <span className="rounded-full border border-cyan/20 bg-cyan/8 px-2 py-0.5 text-[11px] font-semibold text-cyan">
                        {movement.source === "currency" ? "USD" : t("detectedByText")}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted">
                      {movement.description || t("descriptionOptional")} - {formatDate(movement.date)}
                    </p>
                  </div>
                  <div className={movement.usdAmount > 0 ? "text-right text-sm font-semibold text-emerald" : "text-right text-sm font-semibold text-amber"}>
                    {movement.usdAmount > 0 ? formatUsd(movement.usdAmount) : t("usdAmountNotDetected")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <aside className="space-y-4">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md border border-cyan/25 bg-cyan/10 text-cyan">
              <PencilLine size={17} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-text">{t("manualDollarStock")}</h3>
              <p className="text-sm text-muted">{t("manualDollarStockHint")}</p>
            </div>
          </div>

          <label className="mt-4 block text-sm font-medium text-muted" htmlFor="manual-dollar-stock">
            {t("amount")} USD
          </label>
          <input
            className="mt-2 h-11 w-full rounded-md border border-borderSoft bg-background px-3 text-sm text-text outline-none transition focus:border-cyan/50 focus:ring-2 focus:ring-cyan/15"
            id="manual-dollar-stock"
            inputMode="decimal"
            min="0"
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
            type="number"
            value={amount}
          />
          <label className="mt-4 block text-sm font-medium text-muted" htmlFor="dollar-saving-source">
            {t("source")}
          </label>
          <select
            className="mt-2 h-11 w-full rounded-md border border-borderSoft bg-background px-3 text-sm text-text outline-none transition focus:border-cyan/50 focus:ring-2 focus:ring-cyan/15"
            id="dollar-saving-source"
            onChange={(event) => setSource(event.target.value as DollarSavingSource)}
            value={source}
          >
            <option value="manual">{t("dollarSourceManual")}</option>
            <option value="bank">{t("dollarSourceBank")}</option>
            <option value="mercado_pago">{t("dollarSourceMercadoPago")}</option>
            <option value="cash">{t("dollarSourceCash")}</option>
            <option value="other">{t("dollarSourceOther")}</option>
          </select>
          <label className="mt-4 block text-sm font-medium text-muted" htmlFor="dollar-saving-date">
            {t("date")}
          </label>
          <input
            className="mt-2 h-11 w-full rounded-md border border-borderSoft bg-background px-3 text-sm text-text outline-none transition focus:border-cyan/50 focus:ring-2 focus:ring-cyan/15"
            id="dollar-saving-date"
            onChange={(event) => setSavedAt(event.target.value)}
            type="date"
            value={savedAt}
          />
          <label className="mt-4 block text-sm font-medium text-muted" htmlFor="dollar-saving-notes">
            {t("notes")}
          </label>
          <textarea
            className="mt-2 min-h-20 w-full rounded-md border border-borderSoft bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-cyan/50 focus:ring-2 focus:ring-cyan/15"
            id="dollar-saving-notes"
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t("descriptionOptional")}
            value={notes}
          />
          <button
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md border border-cyan/35 bg-cyan/15 px-4 text-sm font-semibold text-cyan transition hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isDisabled || isSaving}
            onClick={handleSubmit}
            type="button"
          >
            {editingId ? t("saveChanges") : t("addDollarSaving")}
          </button>
          {editingId ? (
            <button
              className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md border border-borderSoft px-4 text-sm font-semibold text-muted transition hover:bg-panelSoft hover:text-text"
              onClick={resetForm}
              type="button"
            >
              {t("cancel")}
            </button>
          ) : null}
        </Panel>

        <Panel className="p-5">
          <h3 className="text-base font-semibold text-text">{t("savedDollarEntries")}</h3>
          {dollarSavings.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-muted">{t("noSavedDollarEntries")}</p>
          ) : (
            <div className="mt-4 space-y-2">
              {dollarSavings.map((saving) => (
                <div className="rounded-md border border-borderSoft bg-background/62 p-3" key={saving.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text">{formatUsd(Number(saving.amount))}</div>
                      <div className="mt-1 text-xs text-muted">
                        {t(`dollarSource${saving.source === "mercado_pago" ? "MercadoPago" : saving.source.charAt(0).toUpperCase() + saving.source.slice(1)}` as TranslationKey)}
                        {saving.saved_at ? ` - ${formatDate(saving.saved_at)}` : ""}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        className="rounded-md border border-borderSoft p-2 text-muted transition hover:bg-panelSoft hover:text-cyan"
                        onClick={() => startEditing(saving)}
                        type="button"
                      >
                        <PencilLine size={14} />
                      </button>
                      <button
                        className="rounded-md border border-borderSoft p-2 text-muted transition hover:bg-panelSoft hover:text-rose"
                        disabled={isDisabled}
                        onClick={() => void onDelete(saving.id)}
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {saving.notes ? <p className="mt-2 text-sm leading-5 text-muted">{saving.notes}</p> : null}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="p-5">
          <h3 className="text-base font-semibold text-text">{t("howDollarDetectionWorks")}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{t("howDollarDetectionWorksBody")}</p>
        </Panel>
      </aside>
    </div>
  );
}
