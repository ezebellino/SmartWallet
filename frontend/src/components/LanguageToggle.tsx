import type { Language } from "@/i18n";

export function LanguageToggle({
  language,
  onChange,
  label
}: {
  language: Language;
  onChange: (language: Language) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-borderSoft bg-background px-3 py-2">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex rounded-md bg-panelSoft p-1">
        {(["es", "en"] as const).map((item) => (
          <button
            className={
              item === language
                ? "rounded px-2.5 py-1 text-xs font-semibold text-emerald"
                : "rounded px-2.5 py-1 text-xs font-semibold text-muted hover:text-text"
            }
            key={item}
            onClick={() => onChange(item)}
            type="button"
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

