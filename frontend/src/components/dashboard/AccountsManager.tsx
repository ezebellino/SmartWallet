"use client";

import { ArrowRightLeft, Landmark, Plus, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Panel } from "@/components/ui";
import type { AccountTransfer, AccountType, FinancialAccount } from "@/types/api";

type Props = {
  accounts: FinancialAccount[];
  transfers: AccountTransfer[];
  isDisabled: boolean;
  onCreateAccount: (payload: {
    name: string;
    type: AccountType;
    currency: string;
    institution?: string | null;
    color: string;
    icon: string;
    initial_balance: string;
    notes?: string | null;
  }) => Promise<void>;
  onCreateTransfer: (payload: {
    from_account_id: number;
    to_account_id: number;
    amount: string;
    currency: string;
    description?: string | null;
    transfer_date: string;
  }) => Promise<void>;
};

const today = new Date().toISOString().slice(0, 10);
const accountColors = ["#38bdf8", "#00b1ea", "#16f2a4", "#fbbf24", "#a78bfa"];

export function AccountsManager({
  accounts,
  transfers,
  isDisabled,
  onCreateAccount,
  onCreateTransfer
}: Props) {
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("wallet");
  const [institution, setInstitution] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [color, setColor] = useState(accountColors[1]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDate, setTransferDate] = useState(today);
  const [transferDescription, setTransferDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountName.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onCreateAccount({
        name: accountName.trim(),
        type: accountType,
        currency: "ARS",
        institution: institution.trim() || null,
        color,
        icon: accountType === "bank" ? "landmark" : "wallet",
        initial_balance: initialBalance || "0",
        notes: null
      });
      setAccountName("");
      setInstitution("");
      setInitialBalance("0");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fromId = Number(fromAccountId || accounts[0]?.id);
    const toId = Number(toAccountId || accounts.find((account) => account.id !== fromId)?.id);
    if (!fromId || !toId || fromId === toId || !transferAmount) {
      return;
    }

    setIsSaving(true);
    try {
      await onCreateTransfer({
        from_account_id: fromId,
        to_account_id: toId,
        amount: transferAmount,
        currency: "ARS",
        description: transferDescription.trim() || null,
        transfer_date: transferDate
      });
      setTransferAmount("");
      setTransferDescription("");
      setTransferDate(today);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">Cuentas y transferencias</h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            Separá ingresos/gastos reales de pases internos entre Banco Provincia, Mercado Pago y efectivo.
          </p>
        </div>
        <WalletCards size={18} className="text-cyan" />
      </div>

      <form className="mt-5 grid gap-3" onSubmit={handleCreateAccount}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-cyan">
          <Landmark size={14} />
          Nueva cuenta
        </div>
        <input
          className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none"
          disabled={isDisabled || isSaving}
          maxLength={100}
          minLength={2}
          name="accountName"
          onChange={(event) => setAccountName(event.target.value)}
          placeholder="Banco Provincia, Mercado Pago..."
          value={accountName}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none"
            disabled={isDisabled || isSaving}
            name="accountType"
            onChange={(event) => setAccountType(event.target.value as AccountType)}
            value={accountType}
          >
            <option value="bank">Banco</option>
            <option value="wallet">Billetera</option>
            <option value="cash">Efectivo</option>
            <option value="investment">Inversión</option>
            <option value="other">Otra</option>
          </select>
          <input
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none"
            disabled={isDisabled || isSaving}
            name="institution"
            onChange={(event) => setInstitution(event.target.value)}
            placeholder="Institución"
            value={institution}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none"
            disabled={isDisabled || isSaving}
            min="0"
            name="initialBalance"
            onChange={(event) => setInitialBalance(event.target.value)}
            placeholder="Saldo inicial"
            step="0.01"
            type="number"
            value={initialBalance}
          />
          <div className="flex items-center gap-2">
            {accountColors.map((option) => (
              <button
                aria-label={option}
                className={`h-8 w-8 rounded-md border ${color === option ? "border-text" : "border-borderSoft"}`}
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
          className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan px-4 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isDisabled || isSaving || !accountName.trim()}
          type="submit"
        >
          <Plus size={16} />
          Crear cuenta
        </button>
      </form>

      <div className="mt-5 grid gap-2">
        {accounts.length === 0 ? (
          <p className="rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
            Todavía no hay cuentas. Creá Banco Provincia y Mercado Pago para empezar.
          </p>
        ) : (
          accounts.map((account) => (
            <div className="rounded-md border border-borderSoft bg-background px-3 py-2.5" key={account.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: account.color }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{account.name}</p>
                    <p className="truncate text-xs text-muted">{account.institution || account.type}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-cyan">{account.currency}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <form className="mt-6 grid gap-3" onSubmit={handleCreateTransfer}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald">
          <ArrowRightLeft size={14} />
          Transferencia interna
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none"
            disabled={isDisabled || isSaving || accounts.length < 2}
            name="fromAccountId"
            onChange={(event) => setFromAccountId(event.target.value)}
            value={fromAccountId}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                Desde {account.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none"
            disabled={isDisabled || isSaving || accounts.length < 2}
            name="toAccountId"
            onChange={(event) => setToAccountId(event.target.value)}
            value={toAccountId}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                Hacia {account.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none"
            disabled={isDisabled || isSaving || accounts.length < 2}
            min="0"
            name="transferAmount"
            onChange={(event) => setTransferAmount(event.target.value)}
            placeholder="Importe"
            step="0.01"
            type="number"
            value={transferAmount}
          />
          <input
            className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none"
            disabled={isDisabled || isSaving || accounts.length < 2}
            name="transferDate"
            onChange={(event) => setTransferDate(event.target.value)}
            type="date"
            value={transferDate}
          />
        </div>
        <input
          className="rounded-md border border-borderSoft bg-background px-3 py-2.5 text-sm text-text outline-none"
          disabled={isDisabled || isSaving || accounts.length < 2}
          maxLength={500}
          name="transferDescription"
          onChange={(event) => setTransferDescription(event.target.value)}
          placeholder="Ej: paso sueldo completo a Mercado Pago"
          value={transferDescription}
        />
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald px-4 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isDisabled || isSaving || accounts.length < 2 || !transferAmount}
          type="submit"
        >
          <ArrowRightLeft size={16} />
          Registrar transferencia
        </button>
      </form>

      <div className="mt-5 space-y-2">
        {transfers.slice(0, 5).map((transfer) => (
          <div className="rounded-md border border-borderSoft bg-background px-3 py-2.5" key={transfer.id}>
            <p className="text-sm font-semibold text-text">
              {accountById.get(transfer.from_account_id)?.name ?? "Cuenta"} →{" "}
              {accountById.get(transfer.to_account_id)?.name ?? "Cuenta"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {transfer.currency} {Number(transfer.amount).toLocaleString("es-AR")} · {transfer.transfer_date}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
