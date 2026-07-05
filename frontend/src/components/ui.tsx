import { clsx } from "clsx";
import type { ReactNode } from "react";

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
        "rounded-lg border border-borderSoft/90 bg-panel/88 shadow-panel ring-1 ring-white/[0.025]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral"
}: {
  label: string;
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
    neutral: "from-cyan/35",
    good: "from-emerald/45",
    warn: "from-amber/45",
    bad: "from-rose/45"
  }[tone];
  const dotClass = {
    neutral: "bg-muted",
    good: "bg-emerald",
    warn: "bg-amber",
    bad: "bg-rose"
  }[tone];

  return (
    <Panel className="group relative overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:border-cyan/35 hover:bg-panelSoft/70">
      <div className={clsx("absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent", accentClass)} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-muted">{label}</p>
        <span className={clsx("mt-0.5 h-2 w-2 rounded-full", dotClass)} />
      </div>
      <div className="mt-3 text-2xl font-semibold leading-none text-text">{value}</div>
      <p className={clsx("mt-3 text-sm leading-5", toneClass)}>{detail}</p>
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
