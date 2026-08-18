import { Check, Copy, Play, RefreshCw, ServerCog } from "lucide-react";
import { useState } from "react";
import type { TranslationKey } from "@/i18n";
import type { JobRun, JobStatus } from "@/types/api";

type Props = {
  isDisabled: boolean;
  isRunning: boolean;
  jobRuns: JobRun[];
  jobStatus: JobStatus | null;
  continuousServiceHint?: string;
  localWorkerCommand?: string;
  manualModeHint?: string;
  onRun: () => Promise<void>;
  subtitle?: string;
  t: (key: TranslationKey) => string;
  title?: string;
};

const LOCAL_WORKER_COMMAND = "docker compose --profile worker up -d worker";

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "success" || status === "scheduled" || status === "alive" || status === "sleeping") {
    return "border-emerald/30 text-emerald";
  }
  if (status === "partial_success" || status === "running" || status === "never_run" || status === "starting") {
    return "border-amber/30 text-amber";
  }
  if (status === "failed" || status === "overdue" || status === "error" || status === "stopped") {
    return "border-rose/30 text-rose";
  }
  return "border-borderSoft text-muted";
}

function formatDuration(durationMs: number | null | undefined) {
  if (!durationMs) {
    return "-";
  }
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  return `${Math.round(durationMs / 1000)} s`;
}

function workerStateLabel(state: string, t: (key: TranslationKey) => string) {
  if (state === "scheduled") {
    return t("workerStatescheduled");
  }
  if (state === "alive") {
    return t("workerStatealive");
  }
  if (state === "running") {
    return t("workerStaterunning");
  }
  if (state === "overdue") {
    return t("workerStateoverdue");
  }
  if (state === "never_run") {
    return t("workerStatenever_run");
  }
  return state;
}

export function WorkerControlPanel({
  isDisabled,
  isRunning,
  jobRuns,
  jobStatus,
  continuousServiceHint,
  localWorkerCommand = LOCAL_WORKER_COMMAND,
  manualModeHint,
  onRun,
  subtitle,
  t,
  title
}: Props) {
  const latestRun = jobRuns[0] ?? null;
  const [copiedCommand, setCopiedCommand] = useState(false);

  async function handleCopyWorkerCommand() {
    await navigator.clipboard.writeText(localWorkerCommand);
    setCopiedCommand(true);
    window.setTimeout(() => setCopiedCommand(false), 1800);
  }

  return (
    <div className="mt-5 rounded-md border border-borderSoft bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-text">
            <ServerCog size={16} className="text-cyan" />
            {title ?? t("workerPanelTitle")}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">{subtitle ?? t("workerPanelSubtitle")}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{manualModeHint ?? t("workerManualModeHint")}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-cyan/35 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan transition hover:bg-cyan/15 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isDisabled || isRunning}
          onClick={() => void onRun().catch(() => undefined)}
          type="button"
        >
          {isRunning ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} />}
          {isRunning ? t("workerRunning") : t("workerRunNow")}
        </button>
      </div>

      {jobStatus ? (
        <div className="mt-4 rounded-md border border-borderSoft bg-panel px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs text-muted">{t("workerContinuousService")}</div>
              <div className={`mt-1 inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusClass(jobStatus.state)}`}>
                {workerStateLabel(jobStatus.state, t)}
              </div>
            </div>
            <div className="text-right text-xs text-muted">
              <div>
                {t("workerLastSignal")}: {formatDateTime(jobStatus.heartbeat_last_seen_at)}
              </div>
              <div>
                {t("workerInterval")}: {jobStatus.interval_minutes} min
              </div>
              <div>
                {t("workerNextRun")}: {formatDateTime(jobStatus.next_run_at)}
              </div>
            </div>
          </div>
          {jobStatus.heartbeat_status ? (
            <div className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusClass(jobStatus.heartbeat_status)}`}>
              {t("workerHeartbeat")}: {jobStatus.heartbeat_status}
            </div>
          ) : null}
          <p className="mt-2 text-xs leading-5 text-muted">{jobStatus.message}</p>
          {jobStatus.heartbeat_is_alive ? (
            <p className="mt-2 rounded-md border border-emerald/25 bg-emerald/10 px-3 py-2 text-xs leading-5 text-emerald">
              {t("workerAliveHint")}
            </p>
          ) : continuousServiceHint ? (
            <p className="mt-3 rounded-md border border-amber/25 bg-amber/10 px-3 py-2 text-xs leading-5 text-amber">
              {continuousServiceHint}
            </p>
          ) : (
            <div className="mt-3 rounded-md border border-amber/25 bg-amber/10 p-3">
              <div className="text-xs font-semibold text-amber">{t("workerStoppedHint")}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 overflow-auto rounded-md border border-borderSoft bg-background px-2 py-1.5 text-xs text-text">
                  {localWorkerCommand}
                </code>
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-amber/30 px-2.5 py-1.5 text-xs font-semibold text-amber transition hover:bg-amber/10"
                  onClick={() => void handleCopyWorkerCommand()}
                  type="button"
                >
                  {copiedCommand ? <Check size={13} /> : <Copy size={13} />}
                  {copiedCommand ? t("copied") : t("copy")}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {latestRun ? (
        <div className="mt-4 grid gap-2 md:grid-cols-5">
          <div className="rounded-md border border-borderSoft bg-panel px-3 py-2">
            <div className="text-xs text-muted">{t("status")}</div>
            <div className={`mt-1 inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusClass(latestRun.status)}`}>
              {latestRun.status}
            </div>
          </div>
          <div className="rounded-md border border-borderSoft bg-panel px-3 py-2">
            <div className="text-xs text-muted">{t("workerUsersProcessed")}</div>
            <div className="mt-1 text-base font-semibold text-text">{latestRun.users_processed}</div>
          </div>
          <div className="rounded-md border border-borderSoft bg-panel px-3 py-2">
            <div className="text-xs text-muted">{t("workerSuccessFailure")}</div>
            <div className="mt-1 text-base font-semibold text-text">
              {latestRun.success_count}/{latestRun.failure_count}
            </div>
          </div>
          <div className="rounded-md border border-borderSoft bg-panel px-3 py-2">
            <div className="text-xs text-muted">{t("lastRefresh")}</div>
            <div className="mt-1 text-xs font-semibold text-text">{formatDateTime(latestRun.finished_at)}</div>
          </div>
          <div className="rounded-md border border-borderSoft bg-panel px-3 py-2">
            <div className="text-xs text-muted">{t("workerDuration")}</div>
            <div className="mt-1 text-base font-semibold text-text">{formatDuration(latestRun.duration_ms)}</div>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
          {t("workerNoRuns")}
        </p>
      )}

      {jobRuns.length > 0 ? (
        <div className="mt-3 max-h-44 overflow-auto rounded-md border border-borderSoft">
          {jobRuns.slice(0, 5).map((run) => (
            <div
              className="grid gap-2 border-b border-borderSoft px-3 py-2 text-xs last:border-b-0 md:grid-cols-[120px_92px_1fr_132px]"
              key={run.id}
            >
              <span className="font-semibold text-text">#{run.id} {run.job_key}</span>
              <span className={statusClass(run.status).replace("border-", "text-").replace("/30", "")}>{run.status}</span>
              <span className="truncate text-muted">{run.message ?? "-"}</span>
              <span className="text-muted md:text-right">{formatDateTime(run.finished_at)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
