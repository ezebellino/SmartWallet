import { AlertTriangle, KeyRound, PieChart, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";
import type { TranslationKey } from "@/i18n";
import type {
  BinanceAccount,
  BinanceBalanceSnapshot,
  BinanceIntegration,
  BinancePortfolioAlert,
  BinancePortfolioSummary,
  BinanceSyncResponse
} from "@/types/api";

type Props = {
  account: BinanceAccount | null;
  integration: BinanceIntegration | null;
  isDisabled: boolean;
  onLoadAccount: () => Promise<void>;
  onSyncBalances: () => Promise<BinanceSyncResponse | null>;
  onUpdateIntegration: (payload: {
    enabled?: boolean;
    api_key?: string;
    api_secret?: string;
    clear_credentials?: boolean;
  }) => Promise<void>;
  portfolioSummary: BinancePortfolioSummary | null;
  snapshots: BinanceBalanceSnapshot[];
  t: (key: TranslationKey) => string;
};

function formatCryptoAmount(value: string) {
  return Number(value).toLocaleString("es-AR", {
    maximumFractionDigits: 8,
    minimumFractionDigits: 0
  });
}

function formatUsd(value: string | null | undefined) {
  if (value == null) {
    return "-";
  }

  return `USD ${Number(value).toLocaleString("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  })}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function alertClassName(alert: BinancePortfolioAlert) {
  if (alert.severity === "high") {
    return "border-rose/25 bg-rose/10 text-rose";
  }
  if (alert.severity === "medium") {
    return "border-amber/25 bg-amber/10 text-amber";
  }
  return "border-cyan/25 bg-cyan/10 text-cyan";
}

export function BinanceWalletPanel({
  account,
  integration,
  isDisabled,
  onLoadAccount,
  onSyncBalances,
  onUpdateIntegration,
  portfolioSummary,
  snapshots,
  t
}: Props) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  async function handleSaveCredentials() {
    if (!apiKey.trim() || !apiSecret.trim()) {
      return;
    }
    setIsWorking(true);
    try {
      await onUpdateIntegration({
        enabled: true,
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim()
      });
      setApiKey("");
      setApiSecret("");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleToggleEnabled() {
    setIsWorking(true);
    try {
      await onUpdateIntegration({ enabled: !(integration?.enabled ?? false) });
    } finally {
      setIsWorking(false);
    }
  }

  async function handleClearCredentials() {
    setIsWorking(true);
    try {
      await onUpdateIntegration({ clear_credentials: true, enabled: false });
      setApiKey("");
      setApiSecret("");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleLoadAccount() {
    setIsWorking(true);
    try {
      await onLoadAccount();
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSyncBalances() {
    setIsWorking(true);
    try {
      await onSyncBalances();
    } finally {
      setIsWorking(false);
    }
  }

  const balances = account?.balances ?? [];
  const status = integration?.status ?? "disabled";
  const holdings = portfolioSummary?.holdings ?? [];
  const alerts = portfolioSummary?.alerts ?? [];

  return (
    <div className="mt-5 rounded-md border border-borderSoft bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-text">
            <WalletCards size={16} className="text-cyan" />
            {t("binanceWallet")}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">{t("binanceWalletSubtitle")}</p>
        </div>
        <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
          status === "active" ? "border-emerald/30 text-emerald" : "border-amber/30 text-amber"
        }`}>
          {status === "active" ? t("integrationStatusactive") : status === "needs_key" ? t("integrationStatusneeds_key") : t("integrationStatusdisabled")}
        </span>
      </div>

      <div className="mt-3 rounded-md border border-borderSoft bg-panel p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-text">
              <PieChart size={15} className="text-cyan" />
              {t("binancePortfolioComposition")}
            </div>
            <p className="mt-1 text-xs text-muted">
              {t("lastRefresh")}: {formatDateTime(portfolioSummary?.latest_sync_at ?? integration?.last_sync_at)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-text">
              {formatUsd(portfolioSummary?.total_estimated_value_usd)}
            </div>
            <div className="text-xs text-muted">{t("binancePortfolioValue")}</div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-borderSoft bg-background px-3 py-2">
            <div className="text-xs text-muted">{t("summaryAssets")}</div>
            <div className="mt-1 text-base font-semibold text-text">{portfolioSummary?.asset_count ?? 0}</div>
          </div>
          <div className="rounded-md border border-borderSoft bg-background px-3 py-2">
            <div className="text-xs text-muted">{t("binancePricedAssets")}</div>
            <div className="mt-1 text-base font-semibold text-emerald">{portfolioSummary?.priced_asset_count ?? 0}</div>
          </div>
          <div className="rounded-md border border-borderSoft bg-background px-3 py-2">
            <div className="text-xs text-muted">{t("binanceUnpricedAssets")}</div>
            <div className="mt-1 text-base font-semibold text-amber">{portfolioSummary?.unpriced_asset_count ?? 0}</div>
          </div>
        </div>

        {holdings.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
            {t("binanceNoPortfolioSummary")}
          </p>
        ) : (
          <div className="mt-3 grid gap-2">
            {holdings.slice(0, 8).map((holding) => {
              const allocation = holding.allocation_percentage ?? 0;

              return (
                <div className="rounded-md border border-borderSoft bg-background px-3 py-2" key={holding.asset}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-text">{holding.asset}</div>
                      <div className="text-xs text-muted">
                        {formatCryptoAmount(holding.total)} · {t("currentPrice")}: {formatUsd(holding.price_usd)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-text">{formatUsd(holding.estimated_value_usd)}</div>
                      <div className="text-xs text-muted">{allocation.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panelSoft">
                    <div className="h-full rounded-full bg-cyan" style={{ width: `${Math.min(allocation, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted">
            <AlertTriangle size={13} />
            {t("binancePortfolioAlerts")}
          </div>
          {alerts.length === 0 ? (
            <p className="mt-2 text-xs text-muted">{t("binanceNoPortfolioAlerts")}</p>
          ) : (
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {alerts.slice(0, 4).map((alert) => (
                <div
                  className={`rounded-md border px-3 py-2 text-xs ${alertClassName(alert)}`}
                  key={`${alert.type}-${alert.asset ?? "portfolio"}`}
                >
                  <div className="font-semibold">{alert.title}</div>
                  <p className="mt-1 leading-5 text-muted">{alert.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-md border border-borderSoft bg-panel p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <KeyRound size={15} className="text-cyan" />
            {t("binanceCredentials")}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">{t("binanceCredentialsHint")}</p>

          <div className="mt-3 grid gap-2">
            <input
              className="rounded-md border border-borderSoft bg-background px-3 py-2 text-xs text-text outline-none transition placeholder:text-muted focus:border-cyan"
              disabled={isDisabled || isWorking}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={integration?.has_api_key ? t("replaceApiKey") : t("apiKey")}
              type="password"
              value={apiKey}
            />
            <input
              className="rounded-md border border-borderSoft bg-background px-3 py-2 text-xs text-text outline-none transition placeholder:text-muted focus:border-cyan"
              disabled={isDisabled || isWorking}
              onChange={(event) => setApiSecret(event.target.value)}
              placeholder={t("binanceApiSecret")}
              type="password"
              value={apiSecret}
            />
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              className="rounded-md border border-borderSoft px-3 py-2 text-xs font-semibold text-muted transition hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isDisabled || isWorking || !apiKey.trim() || !apiSecret.trim()}
              onClick={() => void handleSaveCredentials()}
              type="button"
            >
              {isWorking ? t("saving") : t("saveCredentials")}
            </button>
            <button
              className="rounded-md border border-borderSoft px-3 py-2 text-xs font-semibold text-muted transition hover:text-rose disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isDisabled || isWorking || !integration?.has_api_key}
              onClick={() => void handleClearCredentials()}
              type="button"
            >
              {t("clearApiKey")}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-borderSoft bg-background px-2 py-2">
            <span className="text-xs font-medium text-muted">{t("enabled")}</span>
            <button
              aria-pressed={integration?.enabled ?? false}
              className={`h-6 w-11 rounded-full border px-0.5 transition ${
                integration?.enabled ? "border-emerald bg-emerald/25" : "border-borderSoft bg-panelSoft"
              }`}
              disabled={isDisabled || isWorking}
              onClick={() => void handleToggleEnabled()}
              type="button"
            >
              <span
                className={`block h-4 w-4 rounded-full bg-text transition ${
                  integration?.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald/20 bg-emerald/10 px-3 py-2 text-xs text-muted">
            <ShieldCheck size={14} className="text-emerald" />
            {integration?.has_api_key ? `${t("apiKeySaved")} ****${integration.api_key_last4}` : t("binanceNoCredentials")}
          </div>
        </div>

        <div className="rounded-md border border-borderSoft bg-panel p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-text">{t("binanceBalances")}</div>
              <p className="mt-1 text-xs text-muted">
                {t("lastRefresh")}: {formatDateTime(integration?.last_sync_at ?? account?.fetched_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-md border border-borderSoft px-3 py-2 text-xs font-semibold text-muted transition hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isDisabled || isWorking || status !== "active"}
                onClick={() => void handleLoadAccount()}
                type="button"
              >
                <RefreshCw className={isWorking ? "animate-spin" : undefined} size={14} />
                {t("binanceTestConnection")}
              </button>
              <button
                className="rounded-md border border-cyan/35 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan transition hover:bg-cyan/15 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isDisabled || isWorking || status !== "active"}
                onClick={() => void handleSyncBalances()}
                type="button"
              >
                {t("binanceSyncBalances")}
              </button>
            </div>
          </div>

          {balances.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
              {t("binanceNoBalances")}
            </p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {balances.slice(0, 8).map((balance) => (
                <div className="rounded-md border border-borderSoft bg-background px-3 py-2" key={balance.asset}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-text">{balance.asset}</span>
                    <span className="text-sm font-semibold text-cyan">{formatCryptoAmount(balance.total)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {t("available")}: {formatCryptoAmount(balance.free)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <div className="text-xs font-semibold uppercase text-muted">{t("binanceSnapshots")}</div>
            {snapshots.length === 0 ? (
              <p className="mt-2 text-xs text-muted">{t("binanceNoSnapshots")}</p>
            ) : (
              <div className="mt-2 max-h-44 overflow-auto rounded-md border border-borderSoft">
                {snapshots.slice(0, 10).map((snapshot) => (
                  <div className="grid grid-cols-[72px_minmax(0,1fr)_118px] gap-2 border-b border-borderSoft px-3 py-2 text-xs last:border-b-0" key={snapshot.id}>
                    <span className="font-semibold text-text">{snapshot.asset}</span>
                    <span className="text-muted">{formatCryptoAmount(snapshot.total)}</span>
                    <span className="text-right text-muted">{formatDateTime(snapshot.fetched_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
