"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileClock, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import {
  getMercadoPagoIntegration,
  getMercadoPagoReports,
  importMercadoPagoReport,
  requestMercadoPagoReport,
  updateMercadoPagoIntegration
} from "@/services/api";
import type { Language } from "@/i18n";
import type { MercadoPagoImportResponse, MercadoPagoIntegration, MercadoPagoReport } from "@/types/api";
import { Panel } from "@/components/ui";

type Props = {
  token: string | null;
  language: Language;
  initialIntegration: MercadoPagoIntegration | null;
  onImported: () => Promise<void>;
  onStatusChange: (message: string) => void;
};

export function MercadoPagoWalletPanel({ token, language, initialIntegration, onImported, onStatusChange }: Props) {
  const [integration, setIntegration] = useState<MercadoPagoIntegration | null>(initialIntegration);
  const [accessToken, setAccessToken] = useState("");
  const [reports, setReports] = useState<MercadoPagoReport[]>([]);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [lastImport, setLastImport] = useState<MercadoPagoImportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
            importLatest: "Import latest",
            refreshReports: "Refresh list",
            reportRange: "Report range",
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
            importedStatus: "Mercado Pago movements imported"
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
            importLatest: "Importar ultimo",
            refreshReports: "Actualizar lista",
            reportRange: "Rango del reporte",
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
            importedStatus: "Movimientos de Mercado Pago importados"
          },
    [language]
  );

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [beginDate, setBeginDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadIntegration();
  }, [token]);

  useEffect(() => {
    setIntegration(initialIntegration);
  }, [initialIntegration]);

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

  async function loadReports() {
    if (!token) {
      return;
    }

    try {
      const response = await getMercadoPagoReports(token);
      setReports(response);
      setSelectedFileName((current) => current || response[0]?.file_name || "");
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
      await loadReports();
    });
  }

  async function handleImportReport() {
    await runAction(async () => {
      const response = await importMercadoPagoReport(token!, selectedFileName || null);
      setLastImport(response);
      onStatusChange(copy.importedStatus);
      await onImported();
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
            onClick={() => void runAction(loadReports)}
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
            </option>
          ))}
        </select>
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald px-3 py-2 text-sm font-semibold text-black transition hover:bg-emerald/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!token || isLoading || integration?.status !== "active"}
          onClick={handleImportReport}
          type="button"
        >
          <Download size={15} />
          {copy.importLatest}
        </button>
      </div>

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
    </Panel>
  );
}
