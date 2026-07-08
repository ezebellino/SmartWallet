import { ArrowRight, Bot, Sparkles, X } from "lucide-react";
import type { TranslationKey } from "@/i18n";
import type { DashboardSection } from "@/components/dashboard/DashboardSectionNav";

type AssistantItem = {
  actionKey: TranslationKey;
  bodyKey: TranslationKey;
  detail?: string;
  icon: typeof Sparkles;
  section: DashboardSection;
  titleKey: TranslationKey;
  tone: "cyan" | "emerald" | "amber" | "rose";
};

type Props = {
  isOpen: boolean;
  items: AssistantItem[];
  onOpenChange: (isOpen: boolean) => void;
  onSectionChange: (section: DashboardSection) => void;
  t: (key: TranslationKey) => string;
};

const toneClass = {
  amber: "border-amber/30 bg-amber/10 text-amber",
  cyan: "border-cyan/30 bg-cyan/10 text-cyan",
  emerald: "border-emerald/30 bg-emerald/10 text-emerald",
  rose: "border-rose/30 bg-rose/10 text-rose"
};

export function AiAssistantBubble({ isOpen, items, onOpenChange, onSectionChange, t }: Props) {
  if (!isOpen) {
    return (
      <button
        aria-label={t("aiAssistantOpen")}
        className="fixed bottom-24 right-5 z-50 grid h-14 w-14 place-items-center rounded-full border border-cyan/35 bg-cyan/15 text-cyan shadow-panel backdrop-blur transition hover:-translate-y-0.5 hover:bg-cyan/20"
        onClick={() => onOpenChange(true)}
        type="button"
      >
        <Bot size={24} />
      </button>
    );
  }

  return (
    <section className="fixed bottom-24 right-5 z-50 w-[min(420px,calc(100vw-2rem))] rounded-xl border border-cyan/25 bg-panel/96 p-4 shadow-panel backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-cyan/30 bg-cyan/12 text-cyan">
            <Bot size={20} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text">{t("aiAssistantTitle")}</h2>
            <p className="mt-0.5 text-xs leading-5 text-muted">{t("aiAssistantSubtitle")}</p>
          </div>
        </div>
        <button
          aria-label={t("aiAssistantClose")}
          className="rounded-md p-2 text-muted transition hover:bg-panelSoft hover:text-text"
          onClick={() => onOpenChange(false)}
          type="button"
        >
          <X size={17} />
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              className="group flex w-full items-start gap-3 rounded-lg border border-borderSoft bg-background/70 p-3 text-left transition hover:border-cyan/35 hover:bg-panelSoft"
              key={item.titleKey}
              onClick={() => {
                onSectionChange(item.section);
                onOpenChange(false);
              }}
              type="button"
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${toneClass[item.tone]}`}>
                <Icon size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-text">{t(item.titleKey)}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{t(item.bodyKey)}</span>
                {item.detail ? (
                  <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${toneClass[item.tone]}`}>
                    {item.detail}
                  </span>
                ) : null}
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan">
                  {t(item.actionKey)}
                  <ArrowRight className="transition group-hover:translate-x-0.5" size={13} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
