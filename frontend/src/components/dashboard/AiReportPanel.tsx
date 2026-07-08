import { Bot, FileText, Lightbulb, ShieldAlert } from "lucide-react";
import { Panel } from "@/components/ui";
import type { AiReport } from "@/types/api";
import type { TranslationKey } from "@/i18n";

function splitReportText(value?: string) {
  return (
    value
      ?.split(/\n|;|\.\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4) ?? []
  );
}

export function AiReportPanel({
  isDisabled,
  isGenerating,
  onGenerate,
  report,
  t
}: {
  isDisabled: boolean;
  isGenerating: boolean;
  onGenerate: () => Promise<void>;
  report: AiReport | null;
  t: (key: TranslationKey) => string;
}) {
  const recommendations = splitReportText(report?.recommendations);
  const risks = splitReportText(report?.risk_warnings);
  const recommendationItems = report
    ? recommendations.length > 0
      ? recommendations
      : [report.recommendations || t("notAvailable")]
    : [];
  const riskItems = report ? (risks.length > 0 ? risks : [report.risk_warnings || t("notAvailable")]) : [];

  return (
    <Panel className="overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan">{t("aiReportExecutiveView")}</p>
          <h2 className="mt-1 text-lg font-semibold text-text">{t("aiMonthlyReport")}</h2>
        </div>
        <button
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-cyan/35 bg-cyan/15 px-3 text-sm font-semibold text-cyan transition hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isDisabled || isGenerating}
          onClick={() => void onGenerate()}
          type="button"
        >
          <Bot size={16} />
          {isGenerating ? t("working") : t("focusAiReportTitle")}
        </button>
      </div>

      {report ? (
        <>
          <div className="mt-5 rounded-md border border-cyan/20 bg-cyan/8 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan">
              <FileText size={16} />
              <span>{t("aiExecutiveSummary")}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{report.summary}</p>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-md border border-emerald/20 bg-emerald/8 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald">
                <Lightbulb size={16} />
                <span>{t("aiRecommendations")}</span>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-5 text-muted">
                {recommendationItems.map((item) => (
                  <li className="flex gap-2" key={item}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-md border border-amber/20 bg-amber/8 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber">
                <ShieldAlert size={16} />
                <span>{t("aiRiskWarnings")}</span>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-5 text-muted">
                {riskItems.map((item) => (
                  <li className="flex gap-2" key={item}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted">
            <span className="rounded-full border border-borderSoft bg-panelSoft px-3 py-1">
              {t("aiReportPeriod")}: {report.period_month}/{report.period_year}
            </span>
            <span className="rounded-full border border-borderSoft bg-panelSoft px-3 py-1">
              {t("aiReportSource")}: {report.provider}
            </span>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-md border border-dashed border-cyan/25 bg-cyan/8 p-4">
          <h3 className="text-sm font-semibold text-text">{t("aiReportEmptyTitle")}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{t("aiReportEmptyBody")}</p>
        </div>
      )}
    </Panel>
  );
}
