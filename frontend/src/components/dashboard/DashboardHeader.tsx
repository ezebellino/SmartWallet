import { ChevronLeft, ChevronRight, Clock3, LogOut, RefreshCw, UserRound } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import type { DashboardSection } from "@/components/dashboard/DashboardSectionNav";
import type { Language, TranslationKey } from "@/i18n";

type Props = {
  activeSection: DashboardSection;
  isSyncing: boolean;
  sessionRemainingMs: number;
  selectedMonth: number;
  selectedYear: number;
  userName: string;
  onPeriodChange: (direction: "previous" | "next" | "current") => void;
  onSync: () => void;
  onLogout: () => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

export function DashboardHeader({
  activeSection,
  isSyncing,
  sessionRemainingMs,
  selectedMonth,
  selectedYear,
  userName,
  onPeriodChange,
  onSync,
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
    aiReports: "aiReports"
  };

  return (
    <header className="rounded-lg border border-borderSoft/80 bg-panel/54 p-3 shadow-panel ring-1 ring-white/[0.025] sm:p-4 md:flex md:flex-col md:items-stretch md:gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
      <div>
        <h1 className="text-xl font-semibold leading-tight text-text sm:text-2xl">{t(sectionTitle[activeSection])}</h1>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0">
        <div className="inline-flex items-center overflow-hidden rounded-md border border-borderSoft bg-background/60 text-sm text-muted">
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
        </div>
        <button
          aria-label={isSyncing ? t("syncingBackend") : t("syncBackend")}
          className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md border border-cyan/35 bg-cyan/10 text-sm font-semibold text-cyan transition hover:bg-cyan/15 disabled:cursor-wait disabled:opacity-60 sm:h-10 sm:w-auto sm:px-4"
          disabled={isSyncing}
          onClick={onSync}
          title={isSyncing ? t("syncingBackend") : t("syncBackend")}
          type="button"
        >
          <RefreshCw className={isSyncing ? "animate-spin" : undefined} size={16} />
          <span className="hidden sm:inline">{isSyncing ? t("syncingBackend") : t("syncBackend")}</span>
        </button>
        <LanguageToggle language={language} onChange={onLanguageChange} label={t("language")} />
        <div
          className={`${isSessionNearEnd ? "inline-flex border-amber/35 bg-amber/10 text-amber" : "hidden border-borderSoft bg-background/60 text-muted sm:inline-flex"} items-center gap-2 rounded-md border px-3 py-2 text-sm`}
          title={t("sessionTimeRemaining")}
        >
          <Clock3 size={15} />
          {sessionMinutes} min
        </div>
        <div className="hidden items-center gap-2 rounded-md border border-borderSoft bg-background/60 px-3 py-2 text-sm text-muted sm:inline-flex">
          <UserRound size={15} />
          {userName}
        </div>
        <button aria-label={t("logout")} className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md text-sm font-semibold text-muted transition hover:bg-panelSoft hover:text-text sm:h-10 sm:w-auto sm:px-2" onClick={onLogout} title={t("logout")} type="button">
          <LogOut size={15} />
          <span className="hidden sm:inline">{t("logout")}</span>
        </button>
      </div>
    </header>
  );
}
