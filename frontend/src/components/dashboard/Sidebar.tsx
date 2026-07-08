import { Banknote, BarChart3, Bell, Bot, CreditCard, Gauge, LineChart, Target, WalletCards } from "lucide-react";
import type { TranslationKey } from "@/i18n";
import type { BudgetUsage } from "@/types/api";
import type { DashboardSection } from "@/components/dashboard/DashboardSectionNav";

const navigation = [
  ["dashboard", "dashboard", Gauge],
  ["movements", "movements", CreditCard],
  ["budgets", "budgets", BarChart3],
  ["goals", "goals", Target],
  ["dollarSavings", "dollars", Banknote],
  ["investments", "investments", LineChart],
  ["aiReports", "aiReports", Bot]
] as const;

export function Sidebar({
  activeSection,
  budgetUsage,
  onSectionChange,
  t
}: {
  activeSection: DashboardSection;
  budgetUsage: BudgetUsage[];
  onSectionChange: (section: DashboardSection) => void;
  t: (key: TranslationKey) => string;
}) {
  const activeAlerts = budgetUsage.filter((budget) => budget.is_over_budget || budget.is_near_limit).slice(0, 3);

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

      <div className="mt-8 rounded-lg border border-borderSoft/90 bg-panel/82 p-4 ring-1 ring-white/[0.025]">
        <div className="flex items-center gap-2 text-sm font-medium text-text">
          <Bell size={16} className="text-amber" />
            {t("budgetAlerts")}
          </div>
        {activeAlerts.length === 0 ? (
          <p className="mt-2 text-sm leading-5 text-muted">{t("noBudgetAlerts")}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {activeAlerts.map((budget) => (
              <div className="rounded-md border border-borderSoft bg-background px-3 py-2" key={budget.budget_id}>
                <div className="truncate text-sm font-medium text-text">{budget.category_name}</div>
                <div className={budget.is_over_budget ? "mt-1 text-xs text-rose" : "mt-1 text-xs text-amber"}>
                  {budget.is_over_budget ? t("overBudget") : t("nearBudgetLimit")} - {Math.round(budget.usage_percentage)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
