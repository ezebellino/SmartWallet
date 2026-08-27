"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarSync, Download, FileClock, KeyRound, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import {
  applyMercadoPagoNormalization,
  getMercadoPagoIntegration,
  getMercadoPagoReports,
  importMercadoPagoReport,
  previewMercadoPagoNormalization,
  requestMercadoPagoReport,
  syncMercadoPagoMovements,
  updateMercadoPagoIntegration
} from "@/services/api";
import type { Language, TranslationKey } from "@/i18n";
import type {
  JobRun,
  JobStatus,
  MercadoPagoImportResponse,
  MercadoPagoIntegration,
  MercadoPagoNormalizeResponse,
  MercadoPagoReport,
  MercadoPagoSyncResponse
} from "@/types/api";
import { Panel } from "@/components/ui";
import { WorkerControlPanel } from "@/components/dashboard/WorkerControlPanel";

type Props = {
  token: string | null;
  language: Language;
  initialIntegration: MercadoPagoIntegration | null;
  isRunningMercadoPagoWorker: boolean;
  mercadoPagoJobRuns: JobRun[];
  mercadoPagoJobStatus: JobStatus | null;
  selectedMonth: number;
  selectedYear: number;
  onImported: () => Promise<void>;
  onRunMercadoPagoWorker: () => Promise<void>;
  onStatusChange: (message: string) => void;
  t: (key: TranslationKey) => string;
};

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function monthRange(year: number, month: number) {
  return {
    beginDate: formatDate(new Date(year, month - 1, 1)),
    endDate: formatDate(new Date(year, month, 0))
  };
}

export function MercadoPagoWalletPanel({
  token,
  language,
  initialIntegration,
  isRunningMercadoPagoWorker,
  mercadoPagoJobRuns,
  mercadoPagoJobStatus,
  selectedMonth,
  selectedYear,
  onImported,
  onRunMercadoPagoWorker,
  onStatusChange,
  t
}: Props) {
  const [integration, setIntegration] = useState<MercadoPagoIntegration | null>(initialIntegration);
  const [accessToken, setAccessToken] = useState("");
  const [reports, setReports] = useState<MercadoPagoReport[]>([]);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [lastImport, setLastImport] = useState<MercadoPagoImportResponse | null>(null);
  const [lastSync, setLastSync] = useState<MercadoPagoSyncResponse | null>(null);
  const [normalizationPreview, setNormalizationPreview] = useState<MercadoPagoNormalizeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const initialRange = useMemo(() => monthRange(selectedYear, selectedMonth), [selectedMonth, selectedYear]);
  const [beginDate, setBeginDate] = useState(initialRange.beginDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  const copy = useMemo(
    () =>
      language === "en"
        ? {
            title: "Mercado Pago wallet",
            subtitle: "Import approved wallet movements from Mercado Pago reports.",
            token: "Access Token",
            tokenHelp: "Saved encrypted in the backend. It is never shown again.",
            saveToken: "Save token",
            connected: "Connected",
            missingToken: "Token required",
            disabled: "Disabled",
            requestReport: "Request report",
            importLatest: "Import selected",
            refreshReports: "Refresh list",
            reportRange: "Report range",
            syncMovements: "Sync movements",
            syncHelp: "Requests the selected period and imports it automatically when the report is already available.",
            workerTitle: "Mercado Pago worker",
            workerSubtitle: "Automatically syncs recent wallet movements without duplicating imported transactions.",
            workerHint: "This run uses the configured lookback window. The continuous Docker worker runs separately.",
            from: "From",
            to: "To",
            reports: "Available reports",
            noReports: "No reports listed yet.",
            imported: "Imported",
            skipped: "Skipped",
            failed: "Failed",
            sourceNote: "First request the report. When Mercado Pago finishes preparing it, refresh the list and import.",
            signIn: "Sign in to connect Mercado Pago.",
            saved: "Mercado Pago token saved",
            requested: "Mercado Pago report requested",
            importedStatus: "Mercado Pago movements imported",
            previewCleanup: "Preview cleanup",
            applyCleanup: "Apply cleanup",
            cleanupTitle: "Clean existing descriptions",
            cleanupHelp:
              "Uses the selected report to rename old imported movements that still show technical text.",
            cleanupFound: "Descriptions to improve",
            cleanupApplied: "Existing Mercado Pago descriptions cleaned",
            noCleanup: "No old technical descriptions found for this report.",
            syncPending: "Mercado Pago is preparing the report. Try again in a few minutes.",
            syncImported: "Mercado Pago movements synced",
            latestSync: "Latest sync",
            reportsFound: "Reports found",
            reportRequested: "Report requested",
            yes: "Yes",
            no: "No"
          }
        : {
            title: "Wallet Mercado Pago",
            subtitle: "Importa movimientos aprobados desde reportes de Mercado Pago.",
            token: "Access Token",
            tokenHelp: "Se guarda cifrado en el backend. No se vuelve a mostrar.",
            saveToken: "Guardar token",
            connected: "Conectado",
            missingToken: "Falta token",
            disabled: "Desactivado",
            requestReport: "Pedir reporte",
            importLatest: "Importar seleccionado",
            refreshReports: "Actualizar lista",
            reportRange: "Rango del reporte",
            syncMovements: "Sincronizar movimientos",
            syncHelp: "Pide el periodo seleccionado e importa automaticamente si el reporte ya esta disponible.",
            workerTitle: "Worker Mercado Pago",
            workerSubtitle: "Sincroniza automaticamente movimientos recientes de la billetera sin duplicar transacciones.",
            workerHint: "Esta ejecucion usa la ventana reciente configurada. El worker continuo de Docker corre aparte.",
            from: "Desde",
            to: "Hasta",
            reports: "Reportes disponibles",
            noReports: "Todavia no hay reportes listados.",
            imported: "Importados",
            skipped: "Omitidos",
            failed: "Con error",
            sourceNote: "Primero pedi el reporte. Cuando Mercado Pago termine de prepararlo, actualiza la lista e importa.",
            signIn: "Inicia sesion para conectar Mercado Pago.",
            saved: "Token de Mercado Pago guardado",
            requested: "Reporte de Mercado Pago solicitado",
            importedStatus: "Movimientos de Mercado Pago importados",
            previewCleanup: "Previsualizar limpieza",
            applyCleanup: "Aplicar limpieza",
            cleanupTitle: "Limpiar descripciones existentes",
            cleanupHelp:
              "Usa el reporte seleccionado para renombrar movimientos viejos importados que todavia muestran texto tecnico.",
            cleanupFound: "Descripciones para mejorar",
            cleanupApplied: "Descripciones existentes de Mercado Pago limpiadas",
            noCleanup: "No se encontraron descripciones tecnicas viejas para este reporte.",
            syncPending: "Mercado Pago esta preparando el reporte. Volve a intentar en unos minutos.",
            syncImported: "Movimientos de Mercado Pago sincronizados",
            latestSync: "Ultima sincronizacion",
            reportsFound: "Reportes encontrados",
            reportRequested: "Reporte solicitado",
            yes: "Si",
            no: "No"
          },
    [language]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadIntegration();
  }, [token]);

  useEffect(() => {
    setIntegration(initialIntegration);
  }, [initialIntegration]);

  useEffect(() => {
    setBeginDate(initialRange.beginDate);
    setEndDate(initialRange.endDate);
  }, [initialRange.beginDate, initialRange.endDate]);

  async function loadIntegration() {
    if (!token) {
      return;
    }

    const response = await getMercadoPagoIntegration(token);
    setIntegration(response);
    if (response.has_access_token) {
      await loadReports();
    }
  }

  async function loadReports(options: { preferLatest?: boolean } = {}) {
    if (!token) {
      return;
    }

    try {
      const response = await getMercadoPagoReports(token);
      setReports(response);
      setSelectedFileName((current) => {
        const latestFileName = response[0]?.file_name || "";
        const currentStillExists = response.some((report) => report.file_name === current);
        if (options.preferLatest || !current || !currentStillExists) {
          return latestFileName;
        }
        return current;
      });
    } catch (error) {
      onStatusChange(error instanceof Error ? error.message : "Mercado Pago error");
    }
  }

  async function runAction(action: () => Promise<void>) {
    if (!token) {
      onStatusChange(copy.signIn);
      return;
    }

    setIsLoading(true);
    try {
      await action();
    } catch (error) {
      onStatusChange(error instanceof Error ? error.message : "Mercado Pago error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveToken() {
    await runAction(async () => {
      const response = await updateMercadoPagoIntegration(token!, {
        enabled: true,
        access_token: accessToken.trim()
      });
      setIntegration(response);
      setAccessToken("");
      onStatusChange(copy.saved);
      await loadReports();
    });
  }

  async function handleRequestReport() {
    await runAction(async () => {
      await requestMercadoPagoReport(token!, beginDate, endDate);
      onStatusChange(copy.requested);
      await loadReports({ preferLatest: true });
    });
  }

  async function handleImportReport() {
    await runAction(async () => {
      const response = await importMercadoPagoReport(token!, selectedFileName || null);
      setLastImport(response);
      setNormalizationPreview(null);
      onStatusChange(copy.importedStatus);
      await onImported();
    });
  }

  async function handlePreviewNormalization() {
    await runAction(async () => {
      const response = await previewMercadoPagoNormalization(token!, selectedFileName || null);
      setNormalizationPreview(response);
      onStatusChange(response.candidate_count > 0 ? copy.cleanupFound : copy.noCleanup);
    });
  }

  async function handleApplyNormalization() {
    await runAction(async () => {
      const response = await applyMercadoPagoNormalization(token!, selectedFileName || null);
      setNormalizationPreview(response);
      onStatusChange(response.updated_count > 0 ? copy.cleanupApplied : copy.noCleanup);
      if (response.updated_count > 0) {
        await onImported();
      }
    });
  }

  async function handleSyncMovements() {
    await runAction(async () => {
      const response = await syncMercadoPagoMovements(token!, beginDate, endDate);
      if (response.import_result) {
        setLastImport(response.import_result);
        setNormalizationPreview(null);
        onStatusChange(copy.syncImported);
        await onImported();
      } else {
        onStatusChange(response.message || copy.syncPending);
      }
      setLastSync(response);
      await loadReports({ preferLatest: true });
    });
  }

  const statusLabel =
    integration?.status === "active"
      ? copy.connected
      : integration?.status === "needs_token"
        ? copy.missingToken
        : copy.disabled;

  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan">Mercado Pago</p>
          <h2 className="mt-1 text-base font-semibold text-text">{copy.title}</h2>
          <p className="mt-1 text-sm leading-5 text-muted">{copy.subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-cyan/25 bg-cyan/10 px-2 py-1 text-xs font-semibold text-cyan">
          <ShieldCheck size={14} />
          {statusLabel}
        </span>
      </div>

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveToken();
        }}
      >
        <label className="block">
          <span className="text-xs font-semibold text-muted">{copy.token}</span>
          <span className="mt-2 flex items-center gap-2 rounded-md border border-borderSoft bg-background px-3 py-2 text-sm">
            <KeyRound size={15} className="text-muted" />
            <input
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-text outline-none"
              id="mercado-pago-access-token"
              name="mercadoPagoAccessToken"
              placeholder={integration?.access_token_last4 ? `...${integration.access_token_last4}` : "APP_USR-..."}
              type="password"
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
            />
          </span>
          <span className="mt-1 block text-xs leading-4 text-muted">{copy.tokenHelp}</span>
        </label>
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan px-3 py-2 text-sm font-semibold text-black transition hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!token || isLoading || accessToken.trim().length < 20}
          onClick={handleSaveToken}
          type="submit"
        >
          <KeyRound size={15} />
          {copy.saveToken}
        </button>
      </form>

      <div className="mt-5 rounded-lg border border-borderSoft bg-background/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text">{copy.reportRange}</h3>
            <p className="mt-1 text-xs leading-4 text-muted">{copy.sourceNote}</p>
          </div>
          <FileClock size={18} className="text-cyan" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block text-xs font-semibold text-muted">
            {copy.from}
            <input
              className="mt-1 w-full rounded-md border border-borderSoft bg-panel px-2 py-2 text-sm text-text outline-none"
              id="mercado-pago-report-begin-date"
              name="mercadoPagoReportBeginDate"
              type="date"
              value={beginDate}
              onChange={(event) => setBeginDate(event.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            {copy.to}
            <input
              className="mt-1 w-full rounded-md border border-borderSoft bg-panel px-2 py-2 text-sm text-text outline-none"
              id="mercado-pago-report-end-date"
              name="mercadoPagoReportEndDate"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>
        <button
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald px-3 py-2 text-sm font-semibold text-black transition hover:bg-emerald/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!token || isLoading || integration?.status !== "active"}
          onClick={handleSyncMovements}
          type="button"
        >
          <CalendarSync size={15} />
          {copy.syncMovements}
        </button>
        <p className="mt-2 text-xs leading-4 text-muted">{copy.syncHelp}</p>
        <button
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan/30 bg-cyan/10 px-3 py-2 text-sm font-semibold text-cyan transition hover:bg-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!token || isLoading || integration?.status !== "active"}
          onClick={handleRequestReport}
          type="button"
        >
          <FileClock size={15} />
          {copy.requestReport}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-text">{copy.reports}</h3>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-borderSoft text-muted transition hover:border-cyan/35 hover:text-cyan disabled:opacity-50"
            disabled={!token || isLoading || integration?.status !== "active"}
            onClick={() => void runAction(() => loadReports({ preferLatest: true }))}
            title={copy.refreshReports}
            type="button"
          >
            <RefreshCw size={15} />
          </button>
        </div>
        <select
          className="w-full rounded-md border border-borderSoft bg-background px-3 py-2 text-sm text-text outline-none"
          disabled={reports.length === 0}
          value={selectedFileName}
          onChange={(event) => setSelectedFileName(event.target.value)}
        >
          {reports.length === 0 ? <option>{copy.noReports}</option> : null}
          {reports.map((report) => (
            <option key={report.file_name} value={report.file_name}>
              {report.file_name}
              {report.date_created ? ` - ${new Date(report.date_created).toLocaleDateString()}` : ""}
            </option>
          ))}
        </select>
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald px-3 py-2 text-sm font-semibold text-black transition hover:bg-emerald/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!token || isLoading || integration?.status !== "active" || reports.length === 0}
          onClick={handleImportReport}
          type="button"
        >
          <Download size={15} />
          {copy.importLatest}
        </button>
      </div>

      <div className="mt-5 rounded-lg border border-borderSoft bg-background/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text">{copy.cleanupTitle}</h3>
            <p className="mt-1 text-xs leading-4 text-muted">{copy.cleanupHelp}</p>
          </div>
          <Sparkles size={18} className="text-amber" />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-amber/30 bg-amber/10 px-3 py-2 text-sm font-semibold text-amber transition hover:bg-amber/15 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!token || isLoading || integration?.status !== "active" || reports.length === 0}
            onClick={handlePreviewNormalization}
            type="button"
          >
            <Sparkles size={15} />
            {copy.previewCleanup}
          </button>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber px-3 py-2 text-sm font-semibold text-black transition hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              !token ||
              isLoading ||
              integration?.status !== "active" ||
              reports.length === 0 ||
              !normalizationPreview ||
              normalizationPreview.candidate_count === 0
            }
            onClick={handleApplyNormalization}
            type="button"
          >
            <Sparkles size={15} />
            {copy.applyCleanup}
          </button>
        </div>
        {normalizationPreview ? (
          <div className="mt-3 rounded-md border border-amber/20 bg-amber/5 p-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-amber">{copy.cleanupFound}</span>
              <span className="text-text">{normalizationPreview.candidate_count}</span>
            </div>
            <div className="mt-3 space-y-2">
              {normalizationPreview.movements.slice(0, 3).map((movement) => (
                <div key={movement.transaction_id} className="rounded-md border border-borderSoft bg-background px-3 py-2">
                  <div className="truncate text-muted">{movement.current_description}</div>
                  <div className="mt-1 truncate font-semibold text-text">{movement.suggested_description}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {lastSync ? (
        <div className="mt-4 rounded-md border border-cyan/20 bg-cyan/5 p-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-cyan">{copy.latestSync}</span>
            <span className={`rounded-md border px-2 py-0.5 font-semibold ${lastSync.status === "imported" ? "border-emerald/30 text-emerald" : "border-amber/30 text-amber"}`}>
              {lastSync.status}
            </span>
          </div>
          <p className="mt-2 leading-5 text-muted">{lastSync.message}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-borderSoft bg-background px-3 py-2">
              <div className="text-muted">{copy.reportsFound}</div>
              <div className="mt-1 text-base font-semibold text-text">{lastSync.available_reports}</div>
            </div>
            <div className="rounded-md border border-borderSoft bg-background px-3 py-2">
              <div className="text-muted">{copy.reportRequested}</div>
              <div className="mt-1 text-base font-semibold text-text">{lastSync.report_requested ? copy.yes : copy.no}</div>
            </div>
          </div>
        </div>
      ) : null}

      {lastImport ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md border border-emerald/25 bg-emerald/10 p-2 text-emerald">
            <div className="text-lg font-semibold">{lastImport.imported_count}</div>
            {copy.imported}
          </div>
          <div className="rounded-md border border-cyan/25 bg-cyan/10 p-2 text-cyan">
            <div className="text-lg font-semibold">{lastImport.skipped_count}</div>
            {copy.skipped}
          </div>
          <div className="rounded-md border border-rose/25 bg-rose/10 p-2 text-rose">
            <div className="text-lg font-semibold">{lastImport.failed_count}</div>
            {copy.failed}
          </div>
        </div>
      ) : null}

      <WorkerControlPanel
        continuousServiceHint={
          language === "en"
            ? "The continuous worker is deployed on Railway as smartwallet-mercado-pago-worker. If there is still no signal after saving the token, use Run now to force the first sync."
            : "El worker continuo esta desplegado en Railway como smartwallet-mercado-pago-worker. Si todavia no hay senal despues de guardar el token, usa Ejecutar ahora para forzar la primera sincronizacion."
        }
        isDisabled={!token || integration?.status !== "active"}
        isRunning={isRunningMercadoPagoWorker}
        jobRuns={mercadoPagoJobRuns}
        jobStatus={mercadoPagoJobStatus}
        manualModeHint={copy.workerHint}
        onRun={onRunMercadoPagoWorker}
        subtitle={copy.workerSubtitle}
        t={t}
        title={copy.workerTitle}
      />
    </Panel>
  );
}
