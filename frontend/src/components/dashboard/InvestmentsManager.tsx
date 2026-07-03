import { Check, LineChart, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { InvestmentAlertsPanel } from "@/components/dashboard/InvestmentAlertsPanel";
import { InvestmentPerformancePanel } from "@/components/dashboard/InvestmentPerformancePanel";
import { MarketIntegrationsPanel } from "@/components/dashboard/MarketIntegrationsPanel";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatDate } from "@/lib/format";
import type {
  InvestmentAsset,
  InvestmentAlertsResponse,
  InvestmentAssetType,
  MarketDataIntegrationsResponse,
  MarketDataIntegrationUpdate,
  MarketDataRefreshResponse,
  InvestmentOperation,
  InvestmentOperationType,
  InvestmentPriceSnapshot,
  InvestmentRiskLevel,
  PortfolioSummary
} from "@/types/api";

type AssetPayload = {
  name: string;
  symbol: string;
  asset_type: InvestmentAssetType;
  currency: string;
  risk_level: InvestmentRiskLevel;
  current_price?: string | null;
};

type OperationPayload = {
  asset_id: number;
  operation_type: InvestmentOperationType;
  quantity: string;
  unit_price: string;
  fees: string;
  operation_date: string;
};

type Props = {
  assets: InvestmentAsset[];
  investmentAlerts: InvestmentAlertsResponse | null;
  isDisabled: boolean;
  marketDataIntegrations: MarketDataIntegrationsResponse | null;
  marketDataRefresh: MarketDataRefreshResponse | null;
  onCreateAsset: (payload: AssetPayload) => Promise<void>;
  onCreateOperation: (payload: OperationPayload) => Promise<void>;
  onDeleteAsset: (assetId: number) => Promise<void>;
  onLoadPriceHistory: (assetId: number, limit?: number) => Promise<InvestmentPriceSnapshot[]>;
  onRefreshMarketPrices: () => Promise<void>;
  onUpdateMarketIntegration: (providerKey: string, payload: MarketDataIntegrationUpdate) => Promise<void>;
  onUpdateAsset: (assetId: number, payload: Partial<AssetPayload>) => Promise<void>;
  operations: InvestmentOperation[];
  portfolio: PortfolioSummary | null;
  t: (key: TranslationKey) => string;
};

const assetTypes: InvestmentAssetType[] = [
  "stock",
  "crypto",
  "bond",
  "cedear",
  "mutual_fund",
  "index",
  "etf",
  "fixed_term",
  "other"
];
const riskLevels: InvestmentRiskLevel[] = ["low", "medium", "high"];
const today = new Date().toISOString().slice(0, 10);

function formatInvestmentMoney(value: string | null | undefined, currency = "USD") {
  if (value == null) {
    return "-";
  }

  return `${currency} ${Number(value).toLocaleString("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  })}`;
}

function formatInvestmentDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatPriceSource(value: string | null | undefined, t: (key: TranslationKey) => string) {
  if (!value) {
    return t("neverUpdated");
  }
  if (value === "manual") {
    return t("sourceManual");
  }
  return value.toUpperCase();
}

export function InvestmentsManager({
  assets,
  investmentAlerts,
  isDisabled,
  marketDataIntegrations,
  marketDataRefresh,
  onCreateAsset,
  onCreateOperation,
  onDeleteAsset,
  onLoadPriceHistory,
  onRefreshMarketPrices,
  onUpdateMarketIntegration,
  onUpdateAsset,
  operations,
  portfolio,
  t
}: Props) {
  const [assetName, setAssetName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [assetType, setAssetType] = useState<InvestmentAssetType>("stock");
  const [currency, setCurrency] = useState("USD");
  const [riskLevel, setRiskLevel] = useState<InvestmentRiskLevel>("medium");
  const [currentPrice, setCurrentPrice] = useState("");
  const [operationType, setOperationType] = useState<InvestmentOperationType>("buy");
  const [operationAssetId, setOperationAssetId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [fees, setFees] = useState("0");
  const [operationDate, setOperationDate] = useState(today);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingSymbol, setEditingSymbol] = useState("");
  const [editingAssetType, setEditingAssetType] = useState<InvestmentAssetType>("stock");
  const [editingCurrency, setEditingCurrency] = useState("USD");
  const [editingRiskLevel, setEditingRiskLevel] = useState<InvestmentRiskLevel>("medium");
  const [editingCurrentPrice, setEditingCurrentPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const recentOperations = operations.slice(0, 6);

  async function handleCreateAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assetName.trim() || !symbol.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onCreateAsset({
        name: assetName.trim(),
        symbol: symbol.trim(),
        asset_type: assetType,
        currency: currency.trim() || "USD",
        risk_level: riskLevel,
        current_price: currentPrice || null
      });
      setAssetName("");
      setSymbol("");
      setCurrentPrice("");
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateOperation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedAssetId = Number(operationAssetId || assets[0]?.id);
    if (!selectedAssetId || !quantity || !unitPrice) {
      return;
    }

    setIsSaving(true);
    try {
      await onCreateOperation({
        asset_id: selectedAssetId,
        operation_type: operationType,
        quantity,
        unit_price: unitPrice,
        fees: fees || "0",
        operation_date: operationDate
      });
      setQuantity("");
      setUnitPrice("");
      setFees("0");
      setOperationDate(today);
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(asset: InvestmentAsset) {
    setEditingId(asset.id);
    setEditingName(asset.name);
    setEditingSymbol(asset.symbol);
    setEditingAssetType(asset.asset_type);
    setEditingCurrency(asset.currency);
    setEditingRiskLevel(asset.risk_level);
    setEditingCurrentPrice(asset.current_price ?? "");
  }

  async function handleUpdateAsset(asset: InvestmentAsset) {
    if (!editingName.trim() || !editingSymbol.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateAsset(asset.id, {
        name: editingName.trim(),
        symbol: editingSymbol.trim(),
        asset_type: editingAssetType,
        currency: editingCurrency.trim() || "USD",
        risk_level: editingRiskLevel,
        current_price: editingCurrentPrice || null
      });
      setEditingId(null);
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAsset(asset: InvestmentAsset) {
    if (!confirm(t("confirmDeleteInvestmentAsset"))) {
      return;
    }

    setIsSaving(true);
    try {
      await onDeleteAsset(asset.id);
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRefreshMarketPrices() {
    setIsSaving(true);
    try {
      await onRefreshMarketPrices();
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">{t("realInvestments")}</h2>
          <p className="mt-1 text-sm text-muted">{t("realInvestmentsSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-borderSoft px-3 py-2 text-sm font-semibold text-muted transition hover:text-text disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isDisabled || isSaving || assets.length === 0}
            onClick={() => void handleRefreshMarketPrices()}
            type="button"
          >
            <RefreshCw size={15} />
            {t("refreshMarketPrices")}
          </button>
          <LineChart size={18} className="text-cyan" />
        </div>
      </div>

      {marketDataRefresh ? (
        <div className="mt-4 rounded-md border border-borderSoft bg-background p-3">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <span className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-emerald">
              {marketDataRefresh.updated_count} {t("marketPricesUpdatedShort")}
            </span>
            <span className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-amber">
              {marketDataRefresh.skipped_count} {t("marketPricesSkippedShort")}
            </span>
            <span className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-rose">
              {marketDataRefresh.failed_count} {t("marketPricesFailedShort")}
            </span>
          </div>
          {marketDataRefresh.quotes.length ? (
            <div className="mt-3 space-y-1">
              {marketDataRefresh.quotes.slice(0, 5).map((quote) => (
                <div className="flex justify-between gap-3 text-xs text-muted" key={`${quote.asset_id}-${quote.status}`}>
                  <span className="truncate">
                    {quote.symbol} - {quote.provider ?? t("notAvailable")}
                  </span>
                  <span className="shrink-0">
                    {quote.price ? formatInvestmentMoney(quote.price, quote.currency) : quote.message}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <MarketIntegrationsPanel
        integrations={marketDataIntegrations}
        isDisabled={isDisabled}
        onUpdate={onUpdateMarketIntegration}
        t={t}
      />

      <InvestmentAlertsPanel alerts={investmentAlerts} isDisabled={isDisabled} t={t} />

      <InvestmentPerformancePanel
        assets={assets}
        isDisabled={isDisabled}
        onLoadPriceHistory={onLoadPriceHistory}
        t={t}
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <form className="grid gap-3" onSubmit={handleCreateAsset}>
          <div className="text-sm font-medium text-text">{t("investmentAssets")}</div>
          <input
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
            disabled={isDisabled || isSaving}
            maxLength={120}
            minLength={2}
            onChange={(event) => setAssetName(event.target.value)}
            placeholder={t("assetName")}
            value={assetName}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm uppercase text-text outline-none transition placeholder:normal-case placeholder:text-muted focus:border-cyan"
              disabled={isDisabled || isSaving}
              maxLength={30}
              minLength={1}
              onChange={(event) => setSymbol(event.target.value)}
              placeholder={t("assetSymbol")}
              value={symbol}
            />
            <input
              className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm uppercase text-text outline-none transition placeholder:normal-case placeholder:text-muted focus:border-cyan"
              disabled={isDisabled || isSaving}
              maxLength={3}
              minLength={3}
              onChange={(event) => setCurrency(event.target.value)}
              placeholder={t("currency")}
              value={currency}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition focus:border-cyan"
              disabled={isDisabled || isSaving}
              onChange={(event) => setAssetType(event.target.value as InvestmentAssetType)}
              value={assetType}
            >
              {assetTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`assetType${type}` as TranslationKey)}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition focus:border-cyan"
              disabled={isDisabled || isSaving}
              onChange={(event) => setRiskLevel(event.target.value as InvestmentRiskLevel)}
              value={riskLevel}
            >
              {riskLevels.map((risk) => (
                <option key={risk} value={risk}>
                  {t(`risk${risk}` as TranslationKey)}
                </option>
              ))}
            </select>
            <input
              className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
              disabled={isDisabled || isSaving}
              min="0"
              onChange={(event) => setCurrentPrice(event.target.value)}
              placeholder={t("currentPrice")}
              step="0.0001"
              type="number"
              value={currentPrice}
            />
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan px-4 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isDisabled || isSaving || !assetName.trim() || !symbol.trim()}
            type="submit"
          >
            <Plus size={16} />
            {isSaving ? t("saving") : t("addAsset")}
          </button>
        </form>

        <form className="grid gap-3" onSubmit={handleCreateOperation}>
          <div className="text-sm font-medium text-text">{t("investmentOperations")}</div>
          <select
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition focus:border-cyan"
            disabled={isDisabled || isSaving || assets.length === 0}
            onChange={(event) => setOperationAssetId(event.target.value)}
            value={operationAssetId || assets[0]?.id || ""}
          >
            {assets.length === 0 ? (
              <option value="">{t("createAssetFirst")}</option>
            ) : (
              assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.symbol} - {asset.name}
                </option>
              ))
            )}
          </select>
          <div className="grid grid-cols-2 rounded-md border border-borderSoft bg-background p-1">
            {(["buy", "sell"] as const).map((option) => (
              <button
                className={`rounded px-3 py-2 text-sm font-medium transition ${
                  operationType === option ? "bg-panelSoft text-text" : "text-muted hover:text-text"
                }`}
                disabled={isDisabled || isSaving}
                key={option}
                onClick={() => setOperationType(option)}
                type="button"
              >
                {t(option === "buy" ? "operationBuy" : "operationSell")}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
              disabled={isDisabled || isSaving}
              min="0"
              onChange={(event) => setQuantity(event.target.value)}
              placeholder={t("quantity")}
              step="0.00000001"
              type="number"
              value={quantity}
            />
            <input
              className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
              disabled={isDisabled || isSaving}
              min="0"
              onChange={(event) => setUnitPrice(event.target.value)}
              placeholder={t("unitPrice")}
              step="0.0001"
              type="number"
              value={unitPrice}
            />
            <input
              className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
              disabled={isDisabled || isSaving}
              min="0"
              onChange={(event) => setFees(event.target.value)}
              placeholder={t("fees")}
              step="0.01"
              type="number"
              value={fees}
            />
          </div>
          <input
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition focus:border-cyan"
            disabled={isDisabled || isSaving}
            onChange={(event) => setOperationDate(event.target.value)}
            type="date"
            value={operationDate}
          />
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald px-4 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isDisabled || isSaving || assets.length === 0 || !quantity || !unitPrice}
            type="submit"
          >
            <Plus size={16} />
            {isSaving ? t("saving") : t("addOperation")}
          </button>
        </form>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border border-borderSoft bg-background p-3">
          <div className="text-sm font-medium text-text">{t("portfolioSummary")}</div>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-3 text-muted">
              <span>{t("totalInvested")}</span>
              <span className="font-medium text-text">{formatInvestmentMoney(portfolio?.total_invested)}</span>
            </div>
            <div className="flex justify-between gap-3 text-muted">
              <span>{t("estimatedValue")}</span>
              <span className="font-medium text-text">{formatInvestmentMoney(portfolio?.total_estimated_value)}</span>
            </div>
            <div className="flex justify-between gap-3 text-muted">
              <span>{t("unrealizedResult")}</span>
              <span
                className={
                  Number(portfolio?.total_unrealized_gain_loss ?? 0) >= 0
                    ? "font-medium text-emerald"
                    : "font-medium text-rose"
                }
              >
                {formatInvestmentMoney(portfolio?.total_unrealized_gain_loss)}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">{portfolio?.risk_warning ?? t("investmentRiskWarning")}</p>
        </div>

        <div className="rounded-md border border-borderSoft bg-background p-3">
          <div className="text-sm font-medium text-text">{t("portfolioPositions")}</div>
          <div className="mt-3 space-y-2">
            {portfolio?.positions.length ? (
              portfolio.positions.map((position) => (
                <div className="rounded-md border border-borderSoft bg-panel px-3 py-2" key={position.asset_id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-text">
                        {position.symbol} - {position.name}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {Number(position.quantity).toLocaleString("es-AR", { maximumFractionDigits: 8 })} @{" "}
                        {formatInvestmentMoney(position.average_cost, position.currency)}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium text-text">
                        {formatInvestmentMoney(position.estimated_value, position.currency)}
                      </div>
                      <div
                        className={
                          Number(position.unrealized_gain_loss ?? 0) >= 0 ? "text-xs text-emerald" : "text-xs text-rose"
                        }
                      >
                        {formatInvestmentMoney(position.unrealized_gain_loss, position.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
                {t("noPortfolioPositions")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm font-medium text-text">{t("investmentAssets")}</div>
          {assets.length === 0 ? (
            <p className="rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
              {t(isDisabled ? "signInToManageData" : "noInvestmentAssets")}
            </p>
          ) : (
            assets.map((asset) => (
              <div className="rounded-md border border-borderSoft bg-background px-3 py-2.5" key={asset.id}>
                {editingId === asset.id ? (
                  <div className="grid gap-3">
                    <input
                      className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                      disabled={isDisabled || isSaving}
                      onChange={(event) => setEditingName(event.target.value)}
                      value={editingName}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm uppercase text-text outline-none transition focus:border-cyan"
                        disabled={isDisabled || isSaving}
                        onChange={(event) => setEditingSymbol(event.target.value)}
                        value={editingSymbol}
                      />
                      <input
                        className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm uppercase text-text outline-none transition focus:border-cyan"
                        disabled={isDisabled || isSaving}
                        maxLength={3}
                        minLength={3}
                        onChange={(event) => setEditingCurrency(event.target.value)}
                        value={editingCurrency}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <select
                        className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                        disabled={isDisabled || isSaving}
                        onChange={(event) => setEditingAssetType(event.target.value as InvestmentAssetType)}
                        value={editingAssetType}
                      >
                        {assetTypes.map((type) => (
                          <option key={type} value={type}>
                            {t(`assetType${type}` as TranslationKey)}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                        disabled={isDisabled || isSaving}
                        onChange={(event) => setEditingRiskLevel(event.target.value as InvestmentRiskLevel)}
                        value={editingRiskLevel}
                      >
                        {riskLevels.map((risk) => (
                          <option key={risk} value={risk}>
                            {t(`risk${risk}` as TranslationKey)}
                          </option>
                        ))}
                      </select>
                      <input
                        className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                        disabled={isDisabled || isSaving}
                        min="0"
                        onChange={(event) => setEditingCurrentPrice(event.target.value)}
                        step="0.0001"
                        type="number"
                        value={editingCurrentPrice}
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
                        disabled={isSaving || !editingName.trim() || !editingSymbol.trim()}
                        onClick={() => void handleUpdateAsset(asset)}
                        title={t("saveChanges")}
                        type="button"
                      >
                        <Check size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-text">
                        {asset.symbol} - {asset.name}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {t(`assetType${asset.asset_type}` as TranslationKey)} - {t(`risk${asset.risk_level}` as TranslationKey)} -{" "}
                        {formatInvestmentMoney(asset.current_price, asset.currency)}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {t("priceSource")}: {formatPriceSource(asset.price_source, t)} - {t("lastPriceUpdate")}:{" "}
                        {formatInvestmentDateTime(asset.price_updated_at) ?? t("neverUpdated")}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        className="grid h-8 w-8 place-items-center rounded-md border border-borderSoft text-muted transition hover:text-text"
                        disabled={isDisabled || isSaving}
                        onClick={() => startEditing(asset)}
                        title={t("edit")}
                        type="button"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="grid h-8 w-8 place-items-center rounded-md border border-borderSoft text-muted transition hover:border-rose hover:text-rose"
                        disabled={isDisabled || isSaving}
                        onClick={() => void handleDeleteAsset(asset)}
                        title={t("delete")}
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-text">{t("recentInvestmentOperations")}</div>
          {recentOperations.length === 0 ? (
            <p className="rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
              {t("noInvestmentOperations")}
            </p>
          ) : (
            recentOperations.map((operation) => {
              const asset = assetById.get(operation.asset_id);
              const total = Number(operation.quantity) * Number(operation.unit_price) + Number(operation.fees);

              return (
                <div className="rounded-md border border-borderSoft bg-background px-3 py-2.5" key={operation.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-text">
                        {asset?.symbol ?? t("uncategorized")} -{" "}
                        {t(operation.operation_type === "buy" ? "operationBuy" : "operationSell")}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {Number(operation.quantity).toLocaleString("es-AR", { maximumFractionDigits: 8 })} -{" "}
                        {formatDate(operation.operation_date)}
                      </div>
                    </div>
                    <div className={operation.operation_type === "buy" ? "text-sm font-semibold text-rose" : "text-sm font-semibold text-emerald"}>
                      {formatInvestmentMoney(String(total), asset?.currency)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Panel>
  );
}
