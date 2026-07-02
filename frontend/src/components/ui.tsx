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
    <section className={clsx("rounded-lg border border-borderSoft bg-panel/86 shadow-panel", className)}>
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

  return (
    <Panel className="p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
      <div className="mt-3 text-2xl font-semibold leading-none text-text">{value}</div>
      <p className={clsx("mt-3 text-sm", toneClass)}>{detail}</p>
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

