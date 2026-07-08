import { Banknote, Bot, PlusCircle, RefreshCw, Target, WalletCards } from "lucide-react";
import type { TranslationKey } from "@/i18n";
import type { DashboardSection } from "@/components/dashboard/DashboardSectionNav";

type QuickAction = {
  descriptionKey: TranslationKey;
  icon: typeof PlusCircle;
  labelKey: TranslationKey;
  section?: DashboardSection;
  type: "quickTransaction" | "section";
  value: string;
};

type Props = {
  isSyncing: boolean;
  items: QuickAction[];
  onQuickTransactionOpen: () => void;
  onSectionChange: (section: DashboardSection) => void;
  onSync: () => void;
  t: (key: TranslationKey) => string;
};

export const quickActionIcons = {
  ai: Bot,
  dollars: Banknote,
  goal: Target,
  movement: PlusCircle,
  wallet: WalletCards
};

export function QuickActionsBar({ isSyncing, items, onQuickTransactionOpen, onSectionChange, onSync, t }: Props) {
  return (
    <section className="mt-4 rounded-lg border border-borderSoft/90 bg-panel/72 p-3 shadow-panel ring-1 ring-white/[0.025]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-cyan">{t("quickActions")}</p>
          <h2 className="mt-1 text-base font-semibold text-text">{t("quickActionsTitle")}</h2>
        </div>

        <button
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-cyan/35 bg-cyan/10 px-3 text-sm font-semibold text-cyan transition hover:bg-cyan/15 disabled:cursor-wait disabled:opacity-60"
          disabled={isSyncing}
          onClick={onSync}
          type="button"
        >
          <RefreshCw className={isSyncing ? "animate-spin" : undefined} size={16} />
          {isSyncing ? t("syncingBackend") : t("syncBackend")}
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              className="group flex min-h-[86px] items-start gap-3 rounded-md border border-borderSoft/80 bg-background/55 p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan/35 hover:bg-panelSoft/80 focus:outline-none focus-visible:border-cyan/55 focus-visible:ring-2 focus-visible:ring-cyan/25"
              key={item.labelKey}
              onClick={() => {
                if (item.type === "quickTransaction") {
                  onQuickTransactionOpen();
                  return;
                }

                if (item.section) {
                  onSectionChange(item.section);
                }
              }}
              type="button"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-cyan/10 text-cyan transition group-hover:bg-cyan/15">
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-text">{t(item.labelKey)}</span>
                  <span className="shrink-0 text-xs font-semibold text-emerald">{item.value}</span>
                </span>
                <span className="mt-1 block text-xs leading-4 text-muted">{t(item.descriptionKey)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
