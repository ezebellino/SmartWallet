"use client";

import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { Dashboard } from "@/components/Dashboard";
import type { Language } from "@/i18n";

const TOKEN_KEY = "smart-wallet-token";
const NAME_KEY = "smart-wallet-user-name";
const LANGUAGE_KEY = "smart-wallet-language";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("Local Preview");
  const [language, setLanguage] = useState<Language>("es");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setToken(window.localStorage.getItem(TOKEN_KEY));
    setUserName(window.localStorage.getItem(NAME_KEY) ?? "Local Preview");
    const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
    setLanguage(storedLanguage === "en" ? "en" : "es");
    setLoaded(true);
  }, []);

  function handleAuthenticated(nextToken: string, nextName: string) {
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    window.localStorage.setItem(NAME_KEY, nextName);
    setToken(nextToken);
    setUserName(nextName);
  }

  function handleLogout() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(NAME_KEY);
    setToken(null);
    setUserName("Local Preview");
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
    <Dashboard
      language={language}
      onLanguageChange={handleLanguageChange}
      token={token}
      userName={userName}
      onLogout={handleLogout}
    />
  );
}
