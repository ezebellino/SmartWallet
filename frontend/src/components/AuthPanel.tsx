"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, User } from "lucide-react";
import { login, register } from "@/services/api";
import { LanguageToggle } from "@/components/LanguageToggle";
import type { Language, TranslationKey } from "@/i18n";
import { translations } from "@/i18n";

type Props = {
  onAuthenticated: (token: string, name: string) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
};

export function AuthPanel({ onAuthenticated, language, onLanguageChange }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@smartwallet.ai");
  const [password, setPassword] = useState("smart-demo");
  const [fullName, setFullName] = useState("Demo User");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = (key: TranslationKey) => translations[language][key];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response =
        mode === "login" ? await login(email, password) : await register(email, password, fullName);
      onAuthenticated(response.token.access_token, response.user.full_name);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("authFailed");
      setError(message.includes("Could not connect") ? t("networkError") : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md rounded-lg border border-borderSoft bg-panel/95 p-6 shadow-panel">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-emerald/12 text-emerald">
            <LockKeyhole size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text">Smart Wallet AI</h1>
            <p className="text-sm text-muted">{t("authSubtitle")}</p>
          </div>
        </div>

        <div className="mt-6">
          <LanguageToggle language={language} onChange={onLanguageChange} label={t("language")} />
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label className="block">
              <span className="text-sm font-medium text-muted">{t("fullName")}</span>
              <span className="mt-2 flex items-center gap-2 rounded-md border border-borderSoft bg-background px-3 py-3 text-sm">
                <User size={16} className="text-muted" />
                <input
                  className="w-full bg-transparent text-text outline-none"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </span>
            </label>
          )}
          <label className="block">
            <span className="text-sm font-medium text-muted">{t("email")}</span>
            <span className="mt-2 flex items-center gap-2 rounded-md border border-borderSoft bg-background px-3 py-3 text-sm">
              <Mail size={16} className="text-muted" />
              <input
                className="w-full bg-transparent text-text outline-none"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted">{t("password")}</span>
            <span className="mt-2 flex items-center gap-2 rounded-md border border-borderSoft bg-background px-3 py-3 text-sm">
              <LockKeyhole size={16} className="text-muted" />
              <input
                className="w-full bg-transparent text-text outline-none"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                className="text-muted transition hover:text-text"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          {error && <p className="rounded-md border border-rose/30 bg-rose/10 px-3 py-2 text-sm text-rose">{error}</p>}

          <button
            className="w-full rounded-md bg-emerald px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? t("working") : mode === "login" ? t("signIn") : t("createAccount")}
          </button>
        </form>

        <button
          className="mt-5 w-full text-center text-sm text-muted transition hover:text-text"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          type="button"
        >
          {mode === "login" ? t("switchToRegister") : t("switchToLogin")}
        </button>
      </div>
    </div>
  );
}
