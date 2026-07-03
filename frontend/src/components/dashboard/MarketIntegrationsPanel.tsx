import { Cable, CheckCircle2, KeyRound } from "lucide-react";
import type { TranslationKey } from "@/i18n";
import type { MarketDataIntegrationsResponse } from "@/types/api";

type Props = {
  integrations: MarketDataIntegrationsResponse | null;
  isDisabled: boolean;
  t: (key: TranslationKey) => string;
};

function statusClass(status: string) {
  if (status === "active") {
    return "text-emerald";
  }
  if (status === "planned") {
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
  if (status === "active" || status === "planned" || status === "disabled") {
    return t(`integrationStatus${status}` as TranslationKey);
  }

  return status;
}

function integrationCoverageLabel(key: string, fallback: string, t: (key: TranslationKey) => string) {
  if (key === "coingecko" || key === "dolarapi" || key === "manual") {
    return t(`integrationCoverage${key}` as TranslationKey);
  }

  return fallback;
}

export function MarketIntegrationsPanel({ integrations, isDisabled, t }: Props) {
  const items = integrations?.integrations ?? [];

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
                {integration.auth_required ? t("apiKeyRequired") : t("noApiKeyRequired")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
