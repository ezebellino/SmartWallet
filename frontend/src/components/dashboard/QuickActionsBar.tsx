import { PlusCircle } from "lucide-react";
import type { TranslationKey } from "@/i18n";

type Props = {
  onQuickTransactionOpen: () => void;
  t: (key: TranslationKey) => string;
};

export function QuickActionsBar({ onQuickTransactionOpen, t }: Props) {
  return (
    <div className="mt-4 flex justify-end">
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan px-4 text-sm font-semibold text-background transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50"
        onClick={onQuickTransactionOpen}
        type="button"
      >
        <PlusCircle size={17} />
        {t("addMovement")}
      </button>
    </div>
  );
}
