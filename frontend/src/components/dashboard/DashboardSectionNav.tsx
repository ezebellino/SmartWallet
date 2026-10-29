import { useEffect, useRef, useState } from "react";
import { BarChart3, Banknote, Bot, Ellipsis, Gauge, LineChart, RefreshCw, Target, UserRound, WalletCards, X } from "lucide-react";
import type { TranslationKey } from "@/i18n";

export type DashboardSection = "dashboard" | "movements" | "budgets" | "goals" | "dollars" | "investments" | "aiReports" | "profile";

type Props = {
  activeSection: DashboardSection;
  isSyncing: boolean;
  onChange: (section: DashboardSection) => void;
  onSync: () => void;
  t: (key: TranslationKey) => string;
};

const primary = [
  { id: "dashboard", label: "dashboard", icon: Gauge },
  { id: "movements", label: "movements", icon: WalletCards },
  { id: "investments", label: "investments", icon: LineChart }
] as const;

const secondary = [
  { id: "budgets", label: "budgets", icon: BarChart3 },
  { id: "goals", label: "goals", icon: Target },
  { id: "dollars", label: "dollarSavings", icon: Banknote },
  { id: "aiReports", label: "aiReports", icon: Bot },
  { id: "profile", label: "profile", icon: UserRound }
] as const;

export function DashboardSectionNav({ activeSection, isSyncing, onChange, onSync, t }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuButtonRef = useRef<HTMLButtonElement>(null);
  const moreActive = secondary.some(({ id }) => id === activeSection);

  useEffect(() => {
    if (!moreOpen) return;
    firstMenuButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      } else if (event.key === "Tab") {
        const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []);
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  function select(section: DashboardSection) {
    onChange(section);
    setMoreOpen(false);
    if (moreOpen) moreButtonRef.current?.focus();
  }

  return (
    <>
      {moreOpen ? <button aria-label={t("closeMenu")} className="fixed inset-0 z-[60] bg-black/55 lg:hidden" onClick={() => { setMoreOpen(false); moreButtonRef.current?.focus(); }} tabIndex={-1} type="button" /> : null}
      <nav aria-label={t("navigation")} className="fixed inset-x-0 bottom-0 z-[70] border-t border-borderSoft bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
        {moreOpen ? <div aria-label={t("more")} aria-modal="true" className="absolute bottom-full left-0 right-0 max-h-[70vh] overflow-y-auto border-t border-borderSoft bg-background p-3 shadow-panel" id="mobile-more-menu" ref={menuRef} role="dialog">
          <div className="mb-2 flex items-center justify-between px-2 text-sm font-semibold text-text">
            <span>{t("more")}</span>
            <button aria-label={t("closeMenu")} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-panelSoft hover:text-text" onClick={() => { setMoreOpen(false); moreButtonRef.current?.focus(); }} type="button"><X size={18} /></button>
          </div>
          <div className="grid gap-1">
            {secondary.map(({ id, label, icon: Icon }, index) => (
              <button
                aria-current={activeSection === id ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-md px-3 text-left text-sm font-medium ${activeSection === id ? "bg-cyan/10 text-cyan" : "text-muted hover:bg-panelSoft hover:text-text"}`}
                key={id}
                onClick={() => select(id)}
                ref={index === 0 ? firstMenuButtonRef : undefined}
                type="button"
              >
                <Icon size={18} />{t(label)}
              </button>
            ))}
            <div className="mt-2 border-t border-borderSoft pt-2">
              <button className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-muted hover:bg-panelSoft hover:text-text disabled:opacity-50" disabled={isSyncing} onClick={() => { setMoreOpen(false); moreButtonRef.current?.focus(); onSync(); }} type="button">
                <RefreshCw className={isSyncing ? "animate-spin" : undefined} size={18} />{t(isSyncing ? "syncingBackend" : "syncBackend")}
              </button>
            </div>
          </div>
        </div> : null}
        <div className="grid h-[60px] grid-cols-4">
          {primary.map(({ id, label, icon: Icon }) => (
            <button
              aria-current={activeSection === id ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 border-t-2 text-[11px] font-medium ${activeSection === id ? "border-cyan text-cyan" : "border-transparent text-muted"}`}
              key={id}
              onClick={() => select(id)}
              type="button"
            >
              <Icon size={19} /><span className="max-w-full truncate px-1">{t(label)}</span>
            </button>
          ))}
          <button
            aria-controls="mobile-more-menu"
            aria-expanded={moreOpen}
            aria-label={t("more")}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 border-t-2 text-[11px] font-medium ${moreOpen || moreActive ? "border-cyan text-cyan" : "border-transparent text-muted"}`}
            onClick={() => setMoreOpen((value) => !value)}
            ref={moreButtonRef}
            type="button"
          >
            <Ellipsis size={19} /><span>{t("more")}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
