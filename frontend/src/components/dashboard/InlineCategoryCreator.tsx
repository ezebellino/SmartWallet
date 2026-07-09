import { Plus } from "lucide-react";
import { KeyboardEvent, useState } from "react";
import type { TranslationKey } from "@/i18n";
import type { Category, CategoryType } from "@/types/api";

const categoryColors = ["#16f2a4", "#38bdf8", "#fbbf24", "#fb7185", "#a78bfa"];

type Props = {
  isDisabled: boolean;
  onCreate: (payload: { name: string; type: CategoryType; color: string; icon: string }) => Promise<Category | void>;
  onCreated: (category: Category) => void;
  t: (key: TranslationKey) => string;
  type: CategoryType;
};

export function InlineCategoryCreator({ isDisabled, onCreate, onCreated, t, type }: Props) {
  const [color, setColor] = useState(categoryColors[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");

  async function handleCreate() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    setIsSaving(true);
    try {
      const category = await onCreate({
        color,
        icon: type === "income" ? "arrow-up" : "wallet",
        name: trimmedName,
        type
      });

      if (category) {
        onCreated(category);
      }
      setName("");
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleCreate();
    }
  }

  return (
    <div className="rounded-md border border-borderSoft/80 bg-background/55 p-3">
      <div className="text-xs font-semibold uppercase text-cyan">{t("inlineCategoryTitle")}</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className="h-10 rounded-md border border-borderSoft bg-panel px-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
          disabled={isDisabled || isSaving}
          maxLength={80}
          minLength={2}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("categoryName")}
          value={name}
        />
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald/35 bg-emerald/10 px-3 text-sm font-semibold text-emerald transition hover:bg-emerald/15 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isDisabled || isSaving || !name.trim()}
          onClick={() => void handleCreate()}
          type="button"
        >
          <Plus size={15} />
          {isSaving ? t("saving") : t("inlineCreateAndUse")}
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {categoryColors.map((option) => (
          <button
            aria-label={option}
            className={`h-7 w-7 rounded-md border transition ${color === option ? "border-text" : "border-borderSoft"}`}
            disabled={isDisabled || isSaving}
            key={option}
            onClick={() => setColor(option)}
            style={{ backgroundColor: option }}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
