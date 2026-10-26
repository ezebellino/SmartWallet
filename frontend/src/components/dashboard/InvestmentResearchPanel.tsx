import { useEffect, useState } from "react";
import { ArrowUpRight, Newspaper, RefreshCw } from "lucide-react";
import { getMarketNews, type MarketNewsItem } from "@/services/api";
import type { Language } from "@/i18n";

export function InvestmentResearchPanel({ token, language }: { token: string; language: Language }) {
  const [items, setItems] = useState<MarketNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const en = language === "en";
  const locale = en ? "en-US" : "es-AR";

  function refresh() {
    setLoading(true);
    setError(false);
    void getMarketNews(token).then((result) => { setItems(result.items); setError(result.unavailable); }).catch(() => setError(true)).finally(() => setLoading(false));
  }

  useEffect(() => {
    let active = true;
    void getMarketNews(token).then((result) => { if (active) { setItems(result.items); setError(result.unavailable); } }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  return (
    <section className="mt-5 border-t border-borderSoft pt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Newspaper className="text-cyan" size={18} /><h3 className="text-base font-semibold text-text">{en ? "Market news" : "Noticias del mercado"}</h3></div>
        <button aria-label={en ? "Refresh news" : "Actualizar noticias"} className="grid h-9 w-9 place-items-center rounded-md border border-borderSoft text-muted hover:text-text" onClick={refresh} title={en ? "Refresh news" : "Actualizar noticias"} type="button"><RefreshCw size={16} className={loading ? "animate-spin" : undefined} /></button>
      </div>
      <p className="mt-2 text-sm text-muted">{en ? "Official Federal Reserve monetary policy releases. Source articles open in a new tab." : "Comunicados oficiales de política monetaria de la Reserva Federal. Cada nota abre su fuente original."}</p>
      {error ? <p className="mt-3 text-sm text-rose" role="status">{en ? "News source unavailable. Showing saved articles if available." : "La fuente de noticias no responde. Se muestran notas guardadas si las hay."}</p> : null}
      {!loading && !error && items.length === 0 ? <p className="mt-3 text-sm text-muted">{en ? "No articles available right now." : "No hay noticias disponibles en este momento."}</p> : null}
      <div className="mt-4 divide-y divide-borderSoft border-y border-borderSoft">
        {items.map((item) => (
          <a className="flex items-start justify-between gap-4 py-3 text-sm hover:text-cyan" href={item.url} key={item.url} rel="noopener noreferrer" target="_blank">
            <span className="min-w-0"><span className="block font-medium text-text">{item.title}</span><span className="mt-1 block text-xs text-muted">{item.source} · {Number.isNaN(Date.parse(item.published_at)) ? item.published_at : new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(item.published_at))}</span></span>
            <ArrowUpRight className="shrink-0 text-muted" size={16} />
          </a>
        ))}
      </div>
      <div className="mt-6 border-l-2 border-amber pl-4">
        <h3 className="text-sm font-semibold text-text">{en ? "Ideas to research" : "Ideas para investigar"}</h3>
        <p className="mt-1 text-sm text-muted">{en ? "Compare diversification, costs and risk before evaluating any stock or ETF. This is educational material, not a personalized buy recommendation." : "Compará diversificación, costos y riesgo antes de evaluar una acción o ETF. Es material educativo, no una recomendación personalizada de compra."}</p>
      </div>
    </section>
  );
}
