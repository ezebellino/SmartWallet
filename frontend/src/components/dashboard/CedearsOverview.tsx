import { ArrowUpRight, Plus } from "lucide-react";
import type { Language, TranslationKey } from "@/i18n";
import type { InvestmentAsset, PortfolioSummary } from "@/types/api";

export function CedearsOverview({ assets, portfolio, language, onAdd, t }: {
  assets: InvestmentAsset[];
  portfolio: PortfolioSummary | null;
  language: Language;
  onAdd: () => void;
  t: (key: TranslationKey) => string;
}) {
  const cedears = assets.filter((asset) => asset.asset_type === "cedear");
  const positions = new Map(portfolio?.positions.map((position) => [position.asset_id, position]) ?? []);
  const locale = language === "en" ? "en-US" : "es-AR";

  return (
    <section className="border-b border-borderSoft pb-5" aria-label={t("cedearsTitle")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text">{t("cedearsTitle")} <span className="ml-1 text-sm font-normal text-muted">{cedears.length}</span></h3>
          <p className="mt-1 text-sm text-muted">{t("cedearsSubtitle")}</p>
        </div>
        <a className="inline-flex items-center gap-1 text-sm text-cyan hover:underline" href="https://www.byma.com.ar/productos/productos-financieros/cedears" rel="noopener noreferrer" target="_blank">BYMA <ArrowUpRight size={15} /></a>
      </div>
      {cedears.length === 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-borderSoft pt-4">
          <p className="text-sm text-muted">{t("noCedears")}</p>
          <button className="inline-flex items-center gap-2 rounded-md border border-cyan/35 px-3 py-2 text-sm font-semibold text-cyan hover:bg-cyan/10" onClick={onAdd} type="button"><Plus size={16} />{t("addCedear")}</button>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-borderSoft border-y border-borderSoft">
          {cedears.map((asset) => {
            const position = positions.get(asset.id);
            const legacy = asset.price_source === "alphavantage";
            const updatedAt = asset.price_updated_at ? new Date(asset.price_updated_at) : null;
            const updatedLabel = updatedAt && !Number.isNaN(updatedAt.getTime())
              ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(updatedAt)
              : t("neverUpdated");
            return (
              <div className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto]" key={asset.id}>
                <div className="min-w-0">
                  <div className="font-semibold text-text">{asset.symbol} <span className="font-normal text-muted">{asset.name}</span></div>
                  <div className="mt-1 text-xs text-muted">{t("quantity")}: {Number(position?.quantity ?? 0).toLocaleString(locale, { maximumFractionDigits: 8 })} · {t("priceSource")}: {asset.price_source === "iol" ? "IOL" : asset.price_source === "manual" ? t("sourceManual") : asset.price_source ?? "-"} · {updatedLabel}</div>
                  {legacy ? <p className="mt-1 text-xs text-amber">{t("cedearLegacyPrice")}</p> : null}
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-sm font-semibold text-text">{position?.estimated_value != null ? `${asset.currency} ${Number(position.estimated_value).toLocaleString(locale, { maximumFractionDigits: 2 })}` : t("notAvailable")}</div>
                  <div className="text-xs text-muted">{t("currentPrice")}: {!legacy && asset.current_price != null ? `${asset.currency} ${Number(asset.current_price).toLocaleString(locale, { maximumFractionDigits: 4 })}` : "-"}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
