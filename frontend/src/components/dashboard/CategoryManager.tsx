import { Check, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { confirmAction } from "@/lib/alerts";
import type { Category, CategoryType } from "@/types/api";

const categoryColors = ["#16f2a4", "#38bdf8", "#fbbf24", "#fb7185", "#a78bfa"];

type Props = {
  categories: Category[];
  isDisabled: boolean;
  onCreate: (payload: { name: string; type: CategoryType; color: string; icon: string }) => Promise<unknown>;
  onDelete: (categoryId: number) => Promise<void>;
  onUpdate: (categoryId: number, payload: { name?: string; color?: string; icon?: string }) => Promise<void>;
  t: (key: TranslationKey) => string;
};

export function CategoryManager({ categories, isDisabled, onCreate, onDelete, onUpdate, t }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [color, setColor] = useState(categoryColors[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState(categoryColors[0]);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onCreate({ name: name.trim(), type, color, icon: type === "income" ? "arrow-up" : "wallet" });
      setName("");
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingColor(category.color);
  }

  async function handleUpdate(category: Category) {
    if (!editingName.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(category.id, {
        name: editingName.trim(),
        color: editingColor,
        icon: category.icon
      });
      setEditingId(null);
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    const confirmed = await confirmAction({
      cancelText: t("cancel"),
      confirmText: t("delete"),
      title: t("confirmDeleteCategory")
    });

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    try {
      await onDelete(category.id);
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text">{t("realCategories")}</h2>
          <p className="mt-1 text-sm text-muted">{t("realCategoriesSubtitle")}</p>
        </div>
        <Tags size={18} className="text-cyan" />
      </div>

      <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
        <input
          className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
          disabled={isDisabled || isSaving}
          maxLength={80}
          minLength={2}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("categoryName")}
          value={name}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-2 rounded-md border border-borderSoft bg-background p-1">
            {(["expense", "income"] as const).map((option) => (
              <button
                className={`rounded px-3 py-2 text-sm font-medium transition ${
                  type === option ? "bg-panelSoft text-text" : "text-muted hover:text-text"
                }`}
                disabled={isDisabled || isSaving}
                key={option}
                onClick={() => setType(option)}
                type="button"
              >
                {t(option === "expense" ? "expenseType" : "incomeType")}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {categoryColors.map((option) => (
              <button
                aria-label={option}
                className={`h-8 w-8 rounded-md border transition ${
                  color === option ? "border-text" : "border-borderSoft"
                }`}
                disabled={isDisabled || isSaving}
                key={option}
                onClick={() => setColor(option)}
                style={{ backgroundColor: option }}
                type="button"
              />
            ))}
          </div>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald px-4 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isDisabled || isSaving || !name.trim()}
          type="submit"
        >
          <Plus size={16} />
          {isSaving ? t("saving") : t("addCategory")}
        </button>
      </form>

      <div className="mt-5 space-y-2">
        {categories.length === 0 ? (
          <p className="rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
            {t(isDisabled ? "signInToManageData" : "noCategories")}
          </p>
        ) : (
          categories.map((category) => (
            <div
              className="rounded-md border border-borderSoft bg-background px-3 py-2.5"
              key={category.id}
            >
              {editingId === category.id ? (
                <div className="grid gap-3">
                  <input
                    className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                    disabled={isDisabled || isSaving}
                    maxLength={80}
                    minLength={2}
                    onChange={(event) => setEditingName(event.target.value)}
                    value={editingName}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {categoryColors.map((option) => (
                        <button
                          aria-label={option}
                          className={`h-7 w-7 rounded-md border transition ${
                            editingColor === option ? "border-text" : "border-borderSoft"
                          }`}
                          disabled={isDisabled || isSaving}
                          key={option}
                          onClick={() => setEditingColor(option)}
                          style={{ backgroundColor: option }}
                          type="button"
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="grid h-8 w-8 place-items-center rounded-md border border-borderSoft text-muted transition hover:text-text"
                        disabled={isSaving}
                        onClick={() => setEditingId(null)}
                        title={t("cancel")}
                        type="button"
                      >
                        <X size={15} />
                      </button>
                      <button
                        className="grid h-8 w-8 place-items-center rounded-md bg-emerald text-background transition hover:brightness-110 disabled:opacity-55"
                        disabled={isSaving || !editingName.trim()}
                        onClick={() => void handleUpdate(category)}
                        title={t("saveChanges")}
                        type="button"
                      >
                        <Check size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="truncate text-sm font-medium text-text">{category.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs uppercase text-muted">
                      {t(category.type === "expense" ? "expenseType" : "incomeType")}
                    </span>
                    <button
                      className="grid h-8 w-8 place-items-center rounded-md border border-borderSoft text-muted transition hover:text-text"
                      disabled={isDisabled || isSaving}
                      onClick={() => startEditing(category)}
                      title={t("edit")}
                      type="button"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="grid h-8 w-8 place-items-center rounded-md border border-borderSoft text-muted transition hover:border-rose hover:text-rose"
                      disabled={isDisabled || isSaving}
                      onClick={() => void handleDelete(category)}
                      title={t("delete")}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
