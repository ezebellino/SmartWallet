import { useEffect, useState } from "react";
import { Check, UserRound } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getCurrentUser, updateCurrentUser } from "@/services/api";
import type { AuthResponse } from "@/types/api";
import type { Language } from "@/i18n";

type User = AuthResponse["user"];

export function ProfilePanel({ token, language, onLanguageChange, onNameChange }: {
  token: string;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onNameChange: (name: string) => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const en = language === "en";

  useEffect(() => {
    let active = true;
    void getCurrentUser(token).then((value) => {
      if (!active) return;
      setUser(value);
      setName(value.full_name);
    }).catch(() => {
      if (active) setMessage(en ? "Could not load your profile." : "No se pudo cargar tu perfil.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const updated = await updateCurrentUser(token, name.trim());
      setUser(updated);
      setName(updated.full_name);
      onNameChange(updated.full_name);
      setMessage(en ? "Profile updated." : "Perfil actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (en ? "Could not save." : "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 max-w-3xl space-y-6" aria-label={en ? "My profile" : "Mi perfil"}>
      <div className="flex items-center gap-4 border-b border-borderSoft pb-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-cyan/10 text-cyan"><UserRound size={27} /></div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-text">{user?.full_name ?? (en ? "My profile" : "Mi perfil")}</h2>
          <p className="truncate text-sm text-muted">{user?.email}</p>
        </div>
      </div>
      {loading ? <p className="text-sm text-muted">{en ? "Loading..." : "Cargando..."}</p> : null}
      {user ? (
        <div className="grid gap-6 md:grid-cols-2">
          <form className="space-y-4" onSubmit={(event) => void save(event)}>
            <h3 className="text-sm font-semibold text-text">{en ? "Personal details" : "Datos personales"}</h3>
            <label className="block text-sm text-muted">
              {en ? "Full name" : "Nombre completo"}
              <input className="mt-1 w-full rounded-md border border-borderSoft bg-background px-3 py-2 text-text outline-none focus:border-cyan" maxLength={120} minLength={2} onChange={(event) => setName(event.target.value)} required value={name} />
            </label>
            <label className="block text-sm text-muted">
              {en ? "Email (read-only)" : "Correo (solo lectura)"}
              <input className="mt-1 w-full rounded-md border border-borderSoft bg-background px-3 py-2 text-muted" readOnly value={user.email} />
            </label>
            <button className="inline-flex items-center gap-2 rounded-md bg-cyan px-4 py-2 text-sm font-semibold text-background disabled:opacity-50" disabled={saving || name.trim() === user.full_name} type="submit"><Check size={16} />{saving ? (en ? "Saving..." : "Guardando...") : (en ? "Save changes" : "Guardar cambios")}</button>
          </form>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text">{en ? "Preferences" : "Preferencias"}</h3>
            <div className="flex items-center justify-end border-b border-borderSoft pb-4 text-sm text-muted"><LanguageToggle language={language} onChange={onLanguageChange} label={en ? "Language" : "Idioma"} /></div>
            <p className="text-sm text-muted">{en ? "Your financial data stays private to this account." : "Tus datos financieros permanecen privados en esta cuenta."}</p>
          </div>
        </div>
      ) : null}
      {message ? <p className="text-sm text-muted" role="status">{message}</p> : null}
    </section>
  );
}
