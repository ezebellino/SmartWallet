import { Clock3, LogOut, RefreshCw, UserRound } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import type { Language, TranslationKey } from "@/i18n";

type Props = {
  isSyncing: boolean;
  sessionRemainingMs: number;
  status: string;
  userName: string;
  onSync: () => void;
  onLogout: () => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

export function DashboardHeader({ isSyncing, sessionRemainingMs, status, userName, onSync, onLogout, language, onLanguageChange, t }: Props) {
  const sessionMinutes = Math.max(Math.ceil(sessionRemainingMs / 60000), 1);
  const isSessionNearEnd = sessionMinutes <= 5;

  return (
    <header className="rounded-lg border border-borderSoft/80 bg-panel/54 p-4 shadow-panel ring-1 ring-white/[0.025] md:flex md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold leading-tight text-text">{t("financialDashboard")}</h1>
        <p className="mt-1 text-sm leading-5 text-muted">{status}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 md:mt-0">
        <button
          className="inline-flex items-center gap-2 rounded-md border border-cyan/35 bg-cyan/10 px-4 py-2.5 text-sm font-semibold text-cyan transition hover:bg-cyan/15 disabled:cursor-wait disabled:opacity-60"
          disabled={isSyncing}
          onClick={onSync}
          type="button"
        >
          <RefreshCw className={isSyncing ? "animate-spin" : undefined} size={16} />
          {isSyncing ? t("syncingBackend") : t("syncBackend")}
        </button>
        <LanguageToggle language={language} onChange={onLanguageChange} label={t("language")} />
        <div
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            isSessionNearEnd ? "border-amber/35 bg-amber/10 text-amber" : "border-borderSoft bg-background/60 text-muted"
          }`}
          title={t("sessionTimeRemaining")}
        >
          <Clock3 size={15} />
          {sessionMinutes} min
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-borderSoft bg-background/60 px-3 py-2 text-sm text-muted">
          <UserRound size={15} />
          {userName}
        </div>
        <button className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-muted transition hover:bg-panelSoft hover:text-text" onClick={onLogout} type="button">
          <LogOut size={15} />
          {t("logout")}
        </button>
      </div>
    </header>
  );
}
