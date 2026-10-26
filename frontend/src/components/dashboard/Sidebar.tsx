import { Banknote, BarChart3, Bot, CreditCard, Gauge, LineChart, Target, UserRound, WalletCards } from "lucide-react";
import type { TranslationKey } from "@/i18n";
import type { DashboardSection } from "@/components/dashboard/DashboardSectionNav";

const navigation = [
  ["dashboard", "dashboard", Gauge],
  ["movements", "movements", CreditCard],
  ["budgets", "budgets", BarChart3],
  ["goals", "goals", Target],
  ["dollarSavings", "dollars", Banknote],
  ["investments", "investments", LineChart],
  ["aiReports", "aiReports", Bot],
  ["profile", "profile", UserRound]
] as const;

export function Sidebar({
  activeSection,
  onSectionChange,
  t
}: {
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-borderSoft/80 bg-background/82 px-4 py-5 shadow-panel lg:block">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-md border border-emerald/25 bg-emerald/12 text-emerald">
          <WalletCards size={21} />
        </div>
        <div>
          <div className="text-sm font-semibold text-text">Smart Wallet AI</div>
          <div className="text-xs text-muted">{t("personalFinance")}</div>
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        {navigation.map(([label, section, Icon]) => {
          const isActive = activeSection === section;

          return (
            <button
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition ${
                isActive
                  ? "border border-cyan/30 bg-cyan/10 text-cyan"
                  : "border border-transparent text-muted hover:border-borderSoft hover:bg-panelSoft hover:text-text"
              }`}
              key={label}
              onClick={() => onSectionChange(section)}
              type="button"
            >
              <Icon size={17} />
              {t(label)}
            </button>
          );
        })}
      </nav>

    </aside>
  );
}
