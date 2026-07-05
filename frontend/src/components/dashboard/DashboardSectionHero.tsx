import { BarChart3, Bot, CreditCard, Gauge, LineChart, Target } from "lucide-react";
import type { TranslationKey } from "@/i18n";
import type { DashboardSection } from "@/components/dashboard/DashboardSectionNav";

type SummaryItem = {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
};

type Props = {
  activeSection: DashboardSection;
  items: SummaryItem[];
  t: (key: TranslationKey) => string;
};

const sectionMeta: Record<
  DashboardSection,
  {
    accent: string;
    description: TranslationKey;
    icon: typeof Gauge;
    title: TranslationKey;
  }
> = {
  dashboard: {
    accent: "text-emerald",
    description: "sectionDashboardSubtitle",
    icon: Gauge,
    title: "dashboard"
  },
  movements: {
    accent: "text-cyan",
    description: "sectionMovementsSubtitle",
    icon: CreditCard,
    title: "movements"
  },
  budgets: {
    accent: "text-amber",
    description: "sectionBudgetsSubtitle",
    icon: BarChart3,
    title: "budgets"
  },
  goals: {
    accent: "text-emerald",
    description: "sectionGoalsSubtitle",
    icon: Target,
    title: "goals"
  },
  investments: {
    accent: "text-cyan",
    description: "sectionInvestmentsSubtitle",
    icon: LineChart,
    title: "investments"
  },
  aiReports: {
    accent: "text-rose",
    description: "sectionAiReportsSubtitle",
    icon: Bot,
    title: "aiReports"
  }
};

const toneClass = {
  neutral: "text-muted",
  good: "text-emerald",
  warn: "text-amber",
  bad: "text-rose"
};

export function DashboardSectionHero({ activeSection, items, t }: Props) {
  const meta = sectionMeta[activeSection];
  const Icon = meta.icon;

  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-borderSoft/90 bg-panel/72 shadow-panel ring-1 ring-white/[0.025]">
      <div className="h-px bg-gradient-to-r from-cyan/40 via-emerald/30 to-transparent" />
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-md border border-borderSoft bg-background/70 ${meta.accent}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight text-text">{t(meta.title)}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{t(meta.description)}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[380px]">
          {items.map((item) => (
            <div className="rounded-md border border-borderSoft bg-background/62 px-3 py-2 transition hover:border-cyan/25 hover:bg-background/80" key={item.label}>
              <div className="text-[11px] font-semibold uppercase text-muted">{item.label}</div>
              <div className={`mt-1 text-base font-semibold ${toneClass[item.tone ?? "neutral"]}`}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
