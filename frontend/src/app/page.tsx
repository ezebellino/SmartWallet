"use client";

import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { Dashboard } from "@/components/Dashboard";
import type { Language } from "@/i18n";

const TOKEN_KEY = "smart-wallet-token";
const NAME_KEY = "smart-wallet-user-name";
const LANGUAGE_KEY = "smart-wallet-language";
const SESSION_STARTED_AT_KEY = "smart-wallet-session-started-at";
const SESSION_DURATION_MS = 60 * 60 * 1000;
const SESSION_WARNING_MS = 5 * 60 * 1000;

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("Local Preview");
  const [language, setLanguage] = useState<Language>("es");
  const [loaded, setLoaded] = useState(false);
  const [remainingSessionMs, setRemainingSessionMs] = useState(SESSION_DURATION_MS);
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    const storedSessionStartedAt = Number(window.localStorage.getItem(SESSION_STARTED_AT_KEY));
    const now = Date.now();

    if (storedToken && storedSessionStartedAt && now - storedSessionStartedAt >= SESSION_DURATION_MS) {
      clearSession();
      setToken(null);
    } else {
      setToken(storedToken);
      if (storedToken && !storedSessionStartedAt) {
        window.localStorage.setItem(SESSION_STARTED_AT_KEY, String(now));
      }
    }

    setUserName(window.localStorage.getItem(NAME_KEY) ?? "Local Preview");
    const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
    setLanguage(storedLanguage === "en" ? "en" : "es");
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!token) {
      setShowSessionWarning(false);
      return;
    }

    const intervalId = window.setInterval(() => {
      const sessionStartedAt = Number(window.localStorage.getItem(SESSION_STARTED_AT_KEY));

      if (!sessionStartedAt) {
        window.localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
        return;
      }

      const remainingMs = Math.max(SESSION_DURATION_MS - (Date.now() - sessionStartedAt), 0);
      setRemainingSessionMs(remainingMs);
      setShowSessionWarning(remainingMs <= SESSION_WARNING_MS);

      if (remainingMs <= 0) {
        clearSession();
        setToken(null);
        setUserName("Local Preview");
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [token]);

  function handleAuthenticated(nextToken: string, nextName: string) {
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    window.localStorage.setItem(NAME_KEY, nextName);
    window.localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
    setRemainingSessionMs(SESSION_DURATION_MS);
    setShowSessionWarning(false);
    setToken(nextToken);
    setUserName(nextName);
  }

  function handleLogout() {
    clearSession();
    setToken(null);
    setUserName("Local Preview");
  }

  function handleExtendSession() {
    window.localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
    setRemainingSessionMs(SESSION_DURATION_MS);
    setShowSessionWarning(false);
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
        onLogout={handleLogout}
      />
      {showSessionWarning ? (
        <SessionExpiryNotice
          language={language}
          onExtendSession={handleExtendSession}
          onLogout={handleLogout}
          remainingMs={remainingSessionMs}
        />
      ) : null}
    </>
  );
}

function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(NAME_KEY);
  window.localStorage.removeItem(SESSION_STARTED_AT_KEY);
}

function SessionExpiryNotice({
  language,
  onExtendSession,
  onLogout,
  remainingMs
}: {
  language: Language;
  onExtendSession: () => void;
  onLogout: () => void;
  remainingMs: number;
}) {
  const minutes = Math.max(Math.ceil(remainingMs / 60000), 1);
  const copy =
    language === "en"
      ? {
          title: "Session about to expire",
          body: `For your security, the session will close in ${minutes} min.`,
          extend: "Keep session",
          logout: "Log out"
        }
      : {
          title: "Sesion por vencer",
          body: `Por seguridad, la sesion se cerrara en ${minutes} min.`,
          extend: "Mantener sesion",
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
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-md border border-emerald/30 bg-emerald/12 px-3 py-2 text-sm font-semibold text-emerald transition hover:bg-emerald/18"
              onClick={onExtendSession}
              type="button"
            >
              {copy.extend}
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
