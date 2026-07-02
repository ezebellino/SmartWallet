import { BarChart3, Bot, Gauge, LineChart, Target, WalletCards } from "lucide-react";
import type { TranslationKey } from "@/i18n";

export type DashboardSection = "dashboard" | "movements" | "budgets" | "goals" | "investments" | "aiReports";

type Props = {
  activeSection: DashboardSection;
  onChange: (section: DashboardSection) => void;
  t: (key: TranslationKey) => string;
};

const sections: Array<{
  icon: typeof BarChart3;
  id: DashboardSection;
  labelKey: TranslationKey;
}> = [
  { id: "dashboard", labelKey: "dashboard", icon: Gauge },
  { id: "movements", labelKey: "movements", icon: WalletCards },
  { id: "budgets", labelKey: "budgets", icon: BarChart3 },
  { id: "goals", labelKey: "goals", icon: Target },
  { id: "investments", labelKey: "investments", icon: LineChart },
  { id: "aiReports", labelKey: "aiReports", icon: Bot }
];

export function DashboardSectionNav({ activeSection, onChange, t }: Props) {
  return (
    <nav className="mt-4 overflow-x-auto rounded-lg border border-borderSoft bg-panel/78 p-1">
      <div className="grid min-w-[920px] grid-cols-6 gap-1 md:min-w-0">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                isActive ? "bg-cyan text-background" : "text-muted hover:bg-panelSoft hover:text-text"
              }`}
              key={section.id}
              onClick={() => onChange(section.id)}
              type="button"
            >
              <Icon size={16} />
              <span>{t(section.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
