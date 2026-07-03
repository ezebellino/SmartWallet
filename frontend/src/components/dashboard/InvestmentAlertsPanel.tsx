import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { TranslationKey } from "@/i18n";
import type { InvestmentAlert } from "@/types/api";
import type { InvestmentAlertsResponse } from "@/types/api";

type Props = {
  alerts: InvestmentAlertsResponse | null;
  isDisabled: boolean;
  t: (key: TranslationKey) => string;
};

function severityClass(severity: string) {
  if (severity === "high") {
    return "border-rose/40 bg-rose/10 text-rose";
  }
  if (severity === "medium") {
    return "border-amber/40 bg-amber/10 text-amber";
  }
  return "border-borderSoft bg-panel text-muted";
}

const alertCopy: Record<string, { title: TranslationKey; description: TranslationKey }> = {
  missing_price: {
    title: "alertMissingPriceTitle",
    description: "alertMissingPriceDescription"
  },
  stale_price: {
    title: "alertStalePriceTitle",
    description: "alertStalePriceDescription"
  },
  sharp_price_move: {
    title: "alertSharpPriceMoveTitle",
    description: "alertSharpPriceMoveDescription"
  },
  high_risk_concentration: {
    title: "alertHighRiskConcentrationTitle",
    description: "alertHighRiskConcentrationDescription"
  }
};

function getAlertTitle(alert: InvestmentAlert, t: (key: TranslationKey) => string) {
  const translated = alertCopy[alert.type]?.title;
  const prefix = alert.symbol ? `${alert.symbol}: ` : "";
  return `${prefix}${translated ? t(translated) : alert.title}`;
}

function getAlertDescription(alert: InvestmentAlert, t: (key: TranslationKey) => string) {
  const translated = alertCopy[alert.type]?.description;
  return translated ? t(translated) : alert.description;
}

export function InvestmentAlertsPanel({ alerts, isDisabled, t }: Props) {
  const items = alerts?.alerts ?? [];

  return (
    <div className="mt-5 rounded-md border border-borderSoft bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-text">
            <AlertTriangle size={16} className={items.length > 0 ? "text-amber" : "text-emerald"} />
            {t("investmentAlerts")}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">{t("investmentAlertsSubtitle")}</p>
        </div>
        <span className="rounded-md border border-borderSoft px-2.5 py-1 text-xs font-medium text-muted">
          {items.length} {t("alertsCount")}
        </span>
      </div>

      {isDisabled ? (
        <p className="mt-4 rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
          {t("signInToManageData")}
        </p>
      ) : items.length === 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-md border border-borderSoft bg-panel px-3 py-3 text-sm text-muted">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald" />
          <span>{t("noInvestmentAlerts")}</span>
        </div>
      ) : (
        <div className="mt-4 grid gap-2">
          {items.slice(0, 6).map((alert) => (
            <div
              className={`rounded-md border px-3 py-3 ${severityClass(alert.severity)}`}
              key={`${alert.type}-${alert.asset_id ?? "portfolio"}-${alert.symbol ?? "all"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{getAlertTitle(alert, t)}</div>
                  <p className="mt-1 text-xs leading-5 text-muted">{getAlertDescription(alert, t)}</p>
                </div>
                <span className="shrink-0 rounded border border-current/30 px-2 py-1 text-xs uppercase">
                  {t(`severity${alert.severity}` as TranslationKey)}
                </span>
              </div>
              {alert.percentage ? (
                <div className="mt-2 text-xs font-medium text-text">
                  {t("impact")}: {Number(alert.percentage).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
