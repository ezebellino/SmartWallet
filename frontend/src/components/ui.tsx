import { clsx } from "clsx";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

const panelClassName = "rounded-md border border-borderSoft bg-panel shadow-panel";

export function Panel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        panelClassName,
        className
      )}
    >
      {children}
    </section>
  );
}

export function MetricCard({
  actionLabel,
  icon,
  label,
  onClick,
  value,
  detail,
  tone = "neutral"
}: {
  actionLabel?: string;
  icon?: ReactNode;
  label: string;
  onClick?: () => void;
  value: string;
  detail: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    neutral: "text-muted",
    good: "text-emerald",
    warn: "text-amber",
    bad: "text-rose"
  }[tone];
  const accentClass = {
    neutral: "bg-cyan",
    good: "bg-emerald",
    warn: "bg-amber",
    bad: "bg-rose"
  }[tone];
  const dotClass = {
    neutral: "bg-muted",
    good: "bg-emerald",
    warn: "bg-amber",
    bad: "bg-rose"
  }[tone];
  const content = (
    <>
      <div className={clsx("absolute inset-x-0 top-0 h-0.5", accentClass)} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon ? (
            <span className={clsx("grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/5", toneClass)}>{icon}</span>
          ) : null}
          <p className="text-xs font-semibold uppercase text-muted">{label}</p>
        </div>
        <span className={clsx("mt-0.5 h-2 w-2 shrink-0 rounded-full", dotClass)} />
      </div>
      <div className="mt-3 font-display text-xl font-semibold leading-tight text-text [overflow-wrap:anywhere] sm:text-[28px] sm:leading-none">{value}</div>
      <p className={clsx("mt-3 hidden min-h-10 text-sm leading-5 sm:block", toneClass)}>{detail}</p>
      {actionLabel ? (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan transition group-hover:gap-2 sm:mt-4">
          {actionLabel}
          <ArrowUpRight size={14} />
        </span>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        className={clsx(
          panelClassName,
          "group relative min-h-[136px] overflow-hidden p-3 text-left transition-colors hover:border-cyan/50 hover:bg-panelSoft/70 focus:outline-none focus-visible:border-cyan/60 focus-visible:ring-2 focus-visible:ring-cyan/25 sm:min-h-[168px] sm:p-4"
        )}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <Panel className="group relative min-h-[136px] overflow-hidden p-3 transition-colors hover:border-cyan/50 hover:bg-panelSoft/70 sm:min-h-[168px] sm:p-4">
      {content}
    </Panel>
  );
}

export function ProgressBar({ value, tone = "emerald" }: { value: number; tone?: "emerald" | "amber" | "rose" }) {
  const color = {
    emerald: "bg-emerald",
    amber: "bg-amber",
    rose: "bg-rose"
  }[tone];

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
      <div className={clsx("h-full rounded-full", color)} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}
