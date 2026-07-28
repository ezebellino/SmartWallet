import { Bot, CalendarDays, FileText, Lightbulb, ShieldAlert } from "lucide-react";
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
  onPeriodChange,
  report,
  reports,
  selectedMonth,
  selectedYear,
  t
}: {
  isDisabled: boolean;
  isGenerating: boolean;
  onGenerate: () => Promise<void>;
  onPeriodChange: (year: number, month: number) => void;
  report: AiReport | null;
  reports: AiReport[];
  selectedMonth: number;
  selectedYear: number;
  t: (key: TranslationKey) => string;
}) {
  const today = new Date();
  const recentPeriods = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  });
  const recommendations = splitReportText(report?.recommendations);
  const risks = splitReportText(report?.risk_warnings);
  const periodOptions = [
    { year: selectedYear, month: selectedMonth },
    ...recentPeriods,
    ...reports.map((item) => ({ year: item.period_year, month: item.period_month }))
  ].filter(
    (item, index, list) =>
      list.findIndex((option) => option.year === item.year && option.month === item.month) === index
  );
  const selectedPeriodValue = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
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

      <div className="mt-5 grid gap-3 rounded-md border border-borderSoft bg-panelSoft p-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <CalendarDays size={16} className="text-cyan" />
            <span>{t("aiReportHistory")}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">
            {reports.length > 0 ? t("aiReportHistoryBody") : t("aiReportNoHistory")}
          </p>
        </div>
        <label className="grid gap-1 text-xs font-semibold text-muted">
          {t("aiReportPeriodSelector")}
          <select
            className="h-10 rounded-md border border-borderSoft bg-panel px-3 text-sm font-semibold text-text outline-none transition focus:border-cyan/60"
            disabled={isDisabled || isGenerating}
            value={selectedPeriodValue}
            onChange={(event) => {
              const [year, month] = event.target.value.split("-").map(Number);
              onPeriodChange(year, month);
            }}
          >
            {periodOptions.map((item) => (
              <option key={`${item.year}-${item.month}`} value={`${item.year}-${String(item.month).padStart(2, "0")}`}>
                {String(item.month).padStart(2, "0")}/{item.year}
              </option>
            ))}
          </select>
        </label>
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
