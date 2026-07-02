import { Check, Pencil, Plus, PiggyBank, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Panel, ProgressBar } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatDate, formatMoney } from "@/lib/format";
import type { SavingGoal, SavingGoalStatus } from "@/types/api";

type GoalPayload = {
  name: string;
  target_amount: string;
  current_amount: string;
  target_date?: string | null;
  status: SavingGoalStatus;
};

type GoalUpdatePayload = {
  name?: string;
  target_amount?: string;
  current_amount?: string;
  target_date?: string | null;
  status?: SavingGoalStatus;
};

type Props = {
  goals: SavingGoal[];
  isDisabled: boolean;
  onContribute: (goalId: number, amount: string) => Promise<void>;
  onCreate: (payload: GoalPayload) => Promise<void>;
  onDelete: (goalId: number) => Promise<void>;
  onUpdate: (goalId: number, payload: GoalUpdatePayload) => Promise<void>;
  t: (key: TranslationKey) => string;
};

export function GoalsManager({ goals, isDisabled, onContribute, onCreate, onDelete, onUpdate, t }: Props) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingTargetAmount, setEditingTargetAmount] = useState("");
  const [editingCurrentAmount, setEditingCurrentAmount] = useState("");
  const [editingTargetDate, setEditingTargetDate] = useState("");
  const [editingStatus, setEditingStatus] = useState<SavingGoalStatus>("active");
  const [contributionByGoalId, setContributionByGoalId] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !targetAmount) {
      return;
    }

    setIsSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        target_amount: targetAmount,
        current_amount: currentAmount || "0",
        target_date: targetDate || null,
        status: "active"
      });
      setName("");
      setTargetAmount("");
      setCurrentAmount("0");
      setTargetDate("");
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(goal: SavingGoal) {
    setEditingId(goal.id);
    setEditingName(goal.name);
    setEditingTargetAmount(goal.target_amount);
    setEditingCurrentAmount(goal.current_amount);
    setEditingTargetDate(goal.target_date ?? "");
    setEditingStatus(goal.status);
  }

  async function handleUpdate(goal: SavingGoal) {
    if (!editingName.trim() || !editingTargetAmount) {
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(goal.id, {
        name: editingName.trim(),
        target_amount: editingTargetAmount,
        current_amount: editingCurrentAmount || "0",
        target_date: editingTargetDate || null,
        status: editingStatus
      });
      setEditingId(null);
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  async function handleContribution(goal: SavingGoal) {
    const amount = contributionByGoalId[goal.id];
    if (!amount) {
      return;
    }

    setIsSaving(true);
    try {
      await onContribute(goal.id, amount);
      setContributionByGoalId((current) => ({ ...current, [goal.id]: "" }));
    } catch {
      // The dashboard status area displays the backend error.
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(goal: SavingGoal) {
    if (!confirm(t("confirmDeleteGoal"))) {
      return;
    }

    setIsSaving(true);
    try {
      await onDelete(goal.id);
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
          <h2 className="text-base font-semibold text-text">{t("realGoals")}</h2>
          <p className="mt-1 text-sm text-muted">{t("realGoalsSubtitle")}</p>
        </div>
        <PiggyBank size={18} className="text-emerald" />
      </div>

      <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
        <input
          className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
          disabled={isDisabled || isSaving}
          maxLength={120}
          minLength={2}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("goalName")}
          value={name}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
            disabled={isDisabled || isSaving}
            min="0"
            onChange={(event) => setTargetAmount(event.target.value)}
            placeholder={t("goalTarget")}
            step="0.01"
            type="number"
            value={targetAmount}
          />
          <input
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
            disabled={isDisabled || isSaving}
            min="0"
            onChange={(event) => setCurrentAmount(event.target.value)}
            placeholder={t("goalCurrent")}
            step="0.01"
            type="number"
            value={currentAmount}
          />
          <input
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none transition focus:border-cyan"
            disabled={isDisabled || isSaving}
            onChange={(event) => setTargetDate(event.target.value)}
            type="date"
            value={targetDate}
          />
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald px-4 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isDisabled || isSaving || !name.trim() || !targetAmount}
          type="submit"
        >
          <Plus size={16} />
          {isSaving ? t("saving") : t("addGoal")}
        </button>
      </form>

      <div className="mt-5 space-y-3">
        {goals.length === 0 ? (
          <p className="rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
            {t(isDisabled ? "signInToManageData" : "noGoals")}
          </p>
        ) : (
          goals.map((goal) => {
            const progress = goal.progress_percentage;
            const tone = goal.status === "completed" ? "emerald" : progress >= 80 ? "amber" : "emerald";

            return (
              <div className="rounded-md border border-borderSoft bg-background px-3 py-3" key={goal.id}>
                {editingId === goal.id ? (
                  <div className="grid gap-3">
                    <input
                      className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                      disabled={isDisabled || isSaving}
                      maxLength={120}
                      minLength={2}
                      onChange={(event) => setEditingName(event.target.value)}
                      value={editingName}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                        disabled={isDisabled || isSaving}
                        min="0"
                        onChange={(event) => setEditingTargetAmount(event.target.value)}
                        step="0.01"
                        type="number"
                        value={editingTargetAmount}
                      />
                      <input
                        className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                        disabled={isDisabled || isSaving}
                        min="0"
                        onChange={(event) => setEditingCurrentAmount(event.target.value)}
                        step="0.01"
                        type="number"
                        value={editingCurrentAmount}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                        disabled={isDisabled || isSaving}
                        onChange={(event) => setEditingTargetDate(event.target.value)}
                        type="date"
                        value={editingTargetDate}
                      />
                      <select
                        className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan"
                        disabled={isDisabled || isSaving}
                        onChange={(event) => setEditingStatus(event.target.value as SavingGoalStatus)}
                        value={editingStatus}
                      >
                        <option value="active">{t("goalStatusActive")}</option>
                        <option value="completed">{t("goalStatusCompleted")}</option>
                        <option value="paused">{t("goalStatusPaused")}</option>
                        <option value="cancelled">{t("goalStatusCancelled")}</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-end gap-2">
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
                        disabled={isSaving || !editingName.trim() || !editingTargetAmount}
                        onClick={() => void handleUpdate(goal)}
                        title={t("saveChanges")}
                        type="button"
                      >
                        <Check size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-text">{goal.name}</div>
                        <div className="mt-1 text-xs text-muted">
                          {formatMoney(Number(goal.current_amount))} / {formatMoney(Number(goal.target_amount))}
                          {goal.target_date ? ` - ${formatDate(goal.target_date)}` : ""}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs font-semibold uppercase text-muted">
                          {t(`goalStatus${goal.status[0].toUpperCase()}${goal.status.slice(1)}` as TranslationKey)}
                        </span>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-md border border-borderSoft text-muted transition hover:text-text"
                          disabled={isDisabled || isSaving}
                          onClick={() => startEditing(goal)}
                          title={t("edit")}
                          type="button"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-md border border-borderSoft text-muted transition hover:border-rose hover:text-rose"
                          disabled={isDisabled || isSaving}
                          onClick={() => void handleDelete(goal)}
                          title={t("delete")}
                          type="button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <ProgressBar value={progress} tone={tone} />
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        className="rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
                        disabled={isDisabled || isSaving || goal.status === "cancelled" || goal.status === "paused"}
                        min="0"
                        onChange={(event) =>
                          setContributionByGoalId((current) => ({ ...current, [goal.id]: event.target.value }))
                        }
                        placeholder={t("goalContribution")}
                        step="0.01"
                        type="number"
                        value={contributionByGoalId[goal.id] ?? ""}
                      />
                      <button
                        className="rounded-md border border-borderSoft px-3 py-2 text-sm font-medium text-muted transition hover:text-text disabled:cursor-not-allowed disabled:opacity-55"
                        disabled={
                          isDisabled ||
                          isSaving ||
                          !contributionByGoalId[goal.id] ||
                          goal.status === "cancelled" ||
                          goal.status === "paused"
                        }
                        onClick={() => void handleContribution(goal)}
                        type="button"
                      >
                        {t("addContribution")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Panel>
  );
}
