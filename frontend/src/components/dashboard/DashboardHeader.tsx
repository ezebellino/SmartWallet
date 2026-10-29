import { ChevronLeft, ChevronRight, Clock3, LogOut } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import type { DashboardSection } from "@/components/dashboard/DashboardSectionNav";
import type { Language, TranslationKey } from "@/i18n";

type Props = {
  activeSection: DashboardSection;
  sessionRemainingMs: number;
  selectedMonth: number;
  selectedYear: number;
  onPeriodChange: (direction: "previous" | "next" | "current") => void;
  onLogout: () => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

export function DashboardHeader({
  activeSection,
  sessionRemainingMs,
  selectedMonth,
  selectedYear,
  onPeriodChange,
  onLogout,
  language,
  onLanguageChange,
  t
}: Props) {
  const sessionMinutes = Math.max(Math.ceil(sessionRemainingMs / 60000), 1);
  const isSessionNearEnd = sessionMinutes <= 5;
  const locale = language === "en" ? "en-US" : "es-AR";
  const formattedPeriod = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(selectedYear, selectedMonth - 1, 1)
  );
  const periodLabel = formattedPeriod.charAt(0).toLocaleUpperCase(locale) + formattedPeriod.slice(1);
  const sectionTitle: Record<DashboardSection, TranslationKey> = {
    dashboard: "financialDashboard",
    movements: "movements",
    budgets: "budgets",
    goals: "goals",
    dollars: "dollarSavings",
    investments: "investments",
    aiReports: "aiReports",
    profile: "profile"
  };

  return (
    <header className="border-b border-borderSoft pb-4 md:flex md:flex-col md:items-stretch md:gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold leading-tight text-text sm:text-[28px]">{t(sectionTitle[activeSection])}</h1>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0">
        {activeSection !== "profile" && activeSection !== "investments" && activeSection !== "aiReports" ? <div className="inline-flex items-center overflow-hidden rounded-md border border-borderSoft bg-background/60 text-sm text-muted">
          <button
            className="grid h-9 w-9 place-items-center transition hover:bg-panelSoft hover:text-text sm:h-10 sm:w-10"
            onClick={() => onPeriodChange("previous")}
            title={t("previousMonth")}
            type="button"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            className="h-9 border-x border-borderSoft px-2.5 font-semibold text-text transition hover:bg-panelSoft sm:h-10 sm:px-3"
            onClick={() => onPeriodChange("current")}
            title={t("currentMonth")}
            type="button"
          >
            {periodLabel}
          </button>
          <button
            className="grid h-9 w-9 place-items-center transition hover:bg-panelSoft hover:text-text sm:h-10 sm:w-10"
            onClick={() => onPeriodChange("next")}
            title={t("nextMonth")}
            type="button"
          >
            <ChevronRight size={15} />
          </button>
        </div> : null}
        {activeSection !== "profile" ? <LanguageToggle language={language} onChange={onLanguageChange} label={t("language")} /> : null}
        <div
          className={`${isSessionNearEnd ? "inline-flex border-amber/35 bg-amber/10 text-amber" : "hidden border-borderSoft bg-background/60 text-muted sm:inline-flex"} items-center gap-2 rounded-md border px-3 py-2 text-sm`}
          title={t("sessionTimeRemaining")}
        >
          <Clock3 size={15} />
          {sessionMinutes} min
        </div>
        <button aria-label={t("logout")} className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md text-sm font-semibold text-muted transition hover:bg-panelSoft hover:text-text sm:h-10 sm:w-auto sm:px-2" onClick={onLogout} title={t("logout")} type="button">
          <LogOut size={15} />
          <span className="hidden sm:inline">{t("logout")}</span>
        </button>
      </div>
    </header>
  );
}
