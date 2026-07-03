import { Cable, CheckCircle2, KeyRound } from "lucide-react";
import { useState } from "react";
import type { TranslationKey } from "@/i18n";
import type { MarketDataIntegrationUpdate } from "@/types/api";
import type { MarketDataIntegrationsResponse } from "@/types/api";

type Props = {
  integrations: MarketDataIntegrationsResponse | null;
  isDisabled: boolean;
  onUpdate: (providerKey: string, payload: MarketDataIntegrationUpdate) => Promise<void>;
  t: (key: TranslationKey) => string;
};

function statusClass(status: string) {
  if (status === "active") {
    return "text-emerald";
  }
  if (status === "needs_key") {
    return "text-amber";
  }
  return "text-muted";
}

function formatSupportedSymbols(symbols: string[]) {
  if (symbols.length === 0) {
    return "-";
  }

  return symbols.slice(0, 8).join(", ") + (symbols.length > 8 ? "..." : "");
}

function formatRefreshDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function integrationStatusLabel(status: string, t: (key: TranslationKey) => string) {
  if (status === "active" || status === "needs_key" || status === "disabled") {
    return t(`integrationStatus${status}` as TranslationKey);
  }

  return status;
}

function integrationCoverageLabel(key: string, fallback: string, t: (key: TranslationKey) => string) {
  if (key === "coingecko" || key === "dolarapi" || key === "manual" || key === "alphavantage") {
    return t(`integrationCoverage${key}` as TranslationKey);
  }

  return fallback;
}

export function MarketIntegrationsPanel({ integrations, isDisabled, onUpdate, t }: Props) {
  const items = integrations?.integrations ?? [];
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function handleUpdate(providerKey: string, payload: MarketDataIntegrationUpdate) {
    setSavingKey(providerKey);
    try {
      await onUpdate(providerKey, payload);
      if (payload.api_key || payload.clear_api_key) {
        setApiKeys((current) => ({ ...current, [providerKey]: "" }));
      }
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="mt-5 rounded-md border border-borderSoft bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-text">
            <Cable size={16} className="text-cyan" />
            {t("marketIntegrations")}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">{t("marketIntegrationsSubtitle")}</p>
        </div>
        <span className="rounded-md border border-borderSoft px-2.5 py-1 text-xs font-medium text-muted">
          {items.length} {t("providers")}
        </span>
      </div>

      {isDisabled ? (
        <p className="mt-4 rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
          {t("signInToManageData")}
        </p>
      ) : (
        <div className="mt-4 grid gap-2 lg:grid-cols-3">
          {items.map((integration) => (
            <div className="rounded-md border border-borderSoft bg-panel px-3 py-3" key={integration.key}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-text">{integration.name}</div>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {integrationCoverageLabel(integration.key, integration.coverage, t)}
                  </p>
                </div>
                <CheckCircle2 size={16} className={statusClass(integration.status)} />
              </div>

              <div className="mt-3 space-y-2 text-xs text-muted">
                <div className="flex justify-between gap-3">
                  <span>{t("status")}</span>
                  <span className={`font-medium ${statusClass(integration.status)}`}>
                    {integrationStatusLabel(integration.status, t)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>{t("configuredAssets")}</span>
                  <span className="font-medium text-text">{integration.configured_assets_count}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>{t("lastRefresh")}</span>
                  <span className="font-medium text-text">
                    {integration.last_refresh_at ? formatRefreshDate(integration.last_refresh_at) : t("neverUpdated")}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-md border border-borderSoft bg-background px-2 py-2 text-xs text-muted">
                {formatSupportedSymbols(integration.supported_symbols)}
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <KeyRound size={13} />
                {integration.auth_required
                  ? integration.has_api_key
                    ? `${t("apiKeySaved")} ****${integration.api_key_last4}`
                    : t("apiKeyRequired")
                  : t("noApiKeyRequired")}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-borderSoft bg-background px-2 py-2">
                <span className="text-xs font-medium text-muted">{t("enabled")}</span>
                <button
                  aria-pressed={integration.enabled}
                  className={`h-6 w-11 rounded-full border px-0.5 transition ${
                    integration.enabled ? "border-emerald bg-emerald/25" : "border-borderSoft bg-panelSoft"
                  }`}
                  disabled={isDisabled || savingKey === integration.key}
                  onClick={() => void handleUpdate(integration.key, { enabled: !integration.enabled })}
                  type="button"
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-text transition ${
                      integration.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {integration.auth_required ? (
                <div className="mt-3 grid gap-2">
                  <input
                    className="rounded-md border border-borderSoft bg-background px-3 py-2 text-xs text-text outline-none transition placeholder:text-muted focus:border-cyan"
                    disabled={isDisabled || savingKey === integration.key}
                    onChange={(event) =>
                      setApiKeys((current) => ({ ...current, [integration.key]: event.target.value }))
                    }
                    placeholder={integration.has_api_key ? t("replaceApiKey") : t("apiKey")}
                    type="password"
                    value={apiKeys[integration.key] ?? ""}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      className="rounded-md border border-borderSoft px-3 py-2 text-xs font-semibold text-muted transition hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isDisabled || savingKey === integration.key || !(apiKeys[integration.key] ?? "").trim()}
                      onClick={() =>
                        void handleUpdate(integration.key, { api_key: (apiKeys[integration.key] ?? "").trim() })
                      }
                      type="button"
                    >
                      {savingKey === integration.key ? t("saving") : t("saveApiKey")}
                    </button>
                    <button
                      className="rounded-md border border-borderSoft px-3 py-2 text-xs font-semibold text-muted transition hover:text-rose disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isDisabled || savingKey === integration.key || !integration.has_api_key}
                      onClick={() => void handleUpdate(integration.key, { clear_api_key: true })}
                      type="button"
                    >
                      {t("clearApiKey")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
