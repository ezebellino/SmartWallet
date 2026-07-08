import { ArrowRight, Bot, PiggyBank, PlusCircle, ShieldAlert, Sparkles } from "lucide-react";
import type { TranslationKey } from "@/i18n";
import type { DashboardSection } from "@/components/dashboard/DashboardSectionNav";

type FocusItem = {
  actionKey: TranslationKey;
  bodyKey: TranslationKey;
  icon: typeof Sparkles;
  section: DashboardSection;
  titleKey: TranslationKey;
  tone: "cyan" | "emerald" | "amber";
};

type Props = {
  items: FocusItem[];
  onSectionChange: (section: DashboardSection) => void;
  t: (key: TranslationKey) => string;
};

const toneClass = {
  amber: "border-amber/30 bg-amber/10 text-amber",
  cyan: "border-cyan/30 bg-cyan/10 text-cyan",
  emerald: "border-emerald/30 bg-emerald/10 text-emerald"
};

export function ExecutiveFocus({ items, onSectionChange, t }: Props) {
  return (
    <section className="mt-4 rounded-lg border border-cyan/20 bg-gradient-to-br from-cyan/10 via-panel/76 to-panel/58 p-4 shadow-panel ring-1 ring-white/[0.025]">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-cyan/25 bg-cyan/12 text-cyan">
              <Sparkles size={17} />
            </span>
            <h2 className="text-base font-semibold text-text">{t("executiveFocusTitle")}</h2>
          </div>
          <p className="mt-1 text-sm text-muted">{t("executiveFocusSubtitle")}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              className="group rounded-lg border border-borderSoft bg-background/68 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan/35 hover:bg-panelSoft hover:shadow-panel"
              key={item.titleKey}
              onClick={() => onSectionChange(item.section)}
              type="button"
            >
              <div className="flex items-start gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${toneClass[item.tone]}`}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text">{t(item.titleKey)}</span>
                  <span className="mt-1 block text-sm leading-5 text-muted">{t(item.bodyKey)}</span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan">
                    {t(item.actionKey)}
                    <ArrowRight className="transition group-hover:translate-x-0.5" size={14} />
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export const focusIcons = {
  ai: Bot,
  budget: ShieldAlert,
  goal: PiggyBank,
  healthy: Sparkles,
  movement: PlusCircle
};
