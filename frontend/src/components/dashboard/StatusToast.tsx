"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Props = {
  message: string;
  mutedMessage: string;
};

function getTone(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("no se pudo") ||
    normalized.includes("verific") ||
    normalized.includes("not found")
  ) {
    return "error";
  }

  if (
    normalized.includes("cread") ||
    normalized.includes("registrad") ||
    normalized.includes("actualiz") ||
    normalized.includes("eliminad") ||
    normalized.includes("sincroniz") ||
    normalized.includes("calculad") ||
    normalized.includes("created") ||
    normalized.includes("registered") ||
    normalized.includes("updated") ||
    normalized.includes("deleted") ||
    normalized.includes("synced") ||
    normalized.includes("calculated")
  ) {
    return "success";
  }

  return "info";
}

export function StatusToast({ message, mutedMessage }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const tone = useMemo(() => getTone(message), [message]);

  useEffect(() => {
    if (!message || message === mutedMessage) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    const timeoutId = window.setTimeout(() => setIsVisible(false), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [message, mutedMessage]);

  if (!isVisible) {
    return null;
  }

  const Icon = tone === "error" ? XCircle : tone === "success" ? CheckCircle2 : Info;
  const toneClass = {
    error: "border-rose/35 bg-rose/12 text-rose",
    info: "border-cyan/35 bg-cyan/12 text-cyan",
    success: "border-emerald/35 bg-emerald/12 text-emerald"
  }[tone];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))]">
      <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-panel backdrop-blur ${toneClass}`}>
        <Icon className="mt-0.5 shrink-0" size={18} />
        <p className="min-w-0 flex-1 text-sm font-medium leading-5 text-text">{message}</p>
        <button
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition hover:bg-white/8 hover:text-text"
          onClick={() => setIsVisible(false)}
          type="button"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
