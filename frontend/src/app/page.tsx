"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import type { Language } from "@/i18n";
import { getCurrentUser, refreshSession } from "@/services/api";

const Dashboard = dynamic(() => import("@/components/Dashboard").then((mod) => mod.Dashboard), {
  loading: () => (
    <div className="grid min-h-screen place-items-center px-5 py-10 text-sm text-muted">
      Cargando dashboard...
    </div>
  ),
  ssr: false
});

const TOKEN_KEY = "smart-wallet-token";
const NAME_KEY = "smart-wallet-user-name";
const LANGUAGE_KEY = "smart-wallet-language";
const SESSION_WARNING_MS = 5 * 60 * 1000;

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("Local Preview");
  const [language, setLanguage] = useState<Language>("es");
  const [loaded, setLoaded] = useState(false);
  const [remainingSessionMs, setRemainingSessionMs] = useState(0);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const storedToken = window.sessionStorage.getItem(TOKEN_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(NAME_KEY);
    window.localStorage.removeItem("smart-wallet-session-started-at");
    const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
    setLanguage(storedLanguage === "en" ? "en" : "es");

    if (!storedToken || getTokenExpiryMs(storedToken) <= Date.now()) {
      clearSession();
      setLoaded(true);
      return;
    }

    void getCurrentUser(storedToken)
      .then((user) => {
        if (cancelled) return;
        setUserName(user.full_name);
        setToken(storedToken);
        setRemainingSessionMs(Math.max(getTokenExpiryMs(storedToken) - Date.now(), 0));
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!token) {
      setShowSessionWarning(false);
      return;
    }

    const updateRemaining = () => {
      const remainingMs = Math.max(getTokenExpiryMs(token) - Date.now(), 0);
      setRemainingSessionMs(remainingMs);
      setShowSessionWarning(remainingMs <= SESSION_WARNING_MS);

      if (remainingMs <= 0) {
        clearSession();
        setToken(null);
        setUserName("Local Preview");
      }
    };
    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);

    return () => window.clearInterval(intervalId);
  }, [token]);

  function handleAuthenticated(nextToken: string, nextName: string) {
    window.sessionStorage.setItem(TOKEN_KEY, nextToken);
    window.sessionStorage.setItem(NAME_KEY, nextName);
    setRemainingSessionMs(Math.max(getTokenExpiryMs(nextToken) - Date.now(), 0));
    setShowSessionWarning(false);
    setRefreshError(false);
    setToken(nextToken);
    setUserName(nextName);
  }

  function handleLogout() {
    clearSession();
    setToken(null);
    setUserName("Local Preview");
  }

  async function handleExtendSession() {
    if (!token || isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError(false);
    try {
      const response = await refreshSession(token);
      handleAuthenticated(response.token.access_token, response.user.full_name);
    } catch {
      setRefreshError(true);
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleLanguageChange(nextLanguage: Language) {
    window.localStorage.setItem(LANGUAGE_KEY, nextLanguage);
    setLanguage(nextLanguage);
  }

  if (!loaded) {
    return null;
  }

  if (!token) {
    return (
      <AuthPanel
        language={language}
        onAuthenticated={handleAuthenticated}
        onLanguageChange={handleLanguageChange}
      />
    );
  }

  return (
    <>
      <Dashboard
        language={language}
        onLanguageChange={handleLanguageChange}
        sessionRemainingMs={remainingSessionMs}
        token={token}
        userName={userName}
        onNameChange={setUserName}
        onLogout={handleLogout}
      />
      {showSessionWarning ? (
        <SessionExpiryNotice
          language={language}
          onExtendSession={handleExtendSession}
          onLogout={handleLogout}
          remainingMs={remainingSessionMs}
          isRefreshing={isRefreshing}
          refreshError={refreshError}
        />
      ) : null}
    </>
  );
}

function clearSession() {
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(NAME_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(NAME_KEY);
  window.localStorage.removeItem("smart-wallet-session-started-at");
}

function getTokenExpiryMs(token: string): number {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function SessionExpiryNotice({
  language,
  onExtendSession,
  onLogout,
  remainingMs,
  isRefreshing,
  refreshError
}: {
  language: Language;
  onExtendSession: () => Promise<void>;
  onLogout: () => void;
  remainingMs: number;
  isRefreshing: boolean;
  refreshError: boolean;
}) {
  const minutes = Math.max(Math.ceil(remainingMs / 60000), 1);
  const copy =
    language === "en"
      ? {
          title: "Session about to expire",
          body: `For your security, the session will close in ${minutes} min.`,
          extend: "Keep session",
          error: "Could not renew the session. Try again before it expires.",
          logout: "Log out"
        }
      : {
          title: "Sesion por vencer",
          body: `Por seguridad, la sesion se cerrara en ${minutes} min.`,
          extend: "Mantener sesion",
          error: "No se pudo renovar la sesion. Intenta otra vez antes de que venza.",
          logout: "Cerrar sesion"
        };

  return (
    <div className="fixed bottom-5 right-5 z-[60] w-[min(380px,calc(100vw-2rem))] rounded-xl border border-amber/35 bg-panel/95 p-4 shadow-panel backdrop-blur">
      <div className="flex gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-amber/35 bg-amber/12 text-amber">
          <span className="text-lg" aria-hidden="true">
            !
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-text">{copy.title}</h2>
          <p className="mt-1 text-sm leading-5 text-muted">{copy.body}</p>
          {refreshError ? <p className="mt-2 text-xs text-rose" role="alert">{copy.error}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-md border border-emerald/30 bg-emerald/12 px-3 py-2 text-sm font-semibold text-emerald transition hover:bg-emerald/18"
              disabled={isRefreshing}
              onClick={() => void onExtendSession()}
              type="button"
            >
              {isRefreshing ? "..." : copy.extend}
            </button>
            <button
              className="rounded-md border border-borderSoft px-3 py-2 text-sm font-semibold text-muted transition hover:border-rose/35 hover:text-rose"
              onClick={onLogout}
              type="button"
            >
              {copy.logout}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
