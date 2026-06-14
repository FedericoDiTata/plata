"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { settleDebt } from "@/app/actions/debts";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccountWithBalance, Currency, Debt } from "@/lib/types";

/**
 * Saldar una deuda. Opcionalmente registra el movimiento real:
 *  - "Te deben" → te pagaron → ingreso a una cuenta.
 *  - "Debés"    → pagaste    → gasto desde una cuenta.
 */
export function SettleDebtSheet({
  debt,
  accounts,
  currencies,
  onClose,
  onDone,
}: {
  debt: Debt | null;
  accounts: AccountWithBalance[];
  currencies: Currency[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [register, setRegister] = useState(true);
  const [accountId, setAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const curOf = (code: string) =>
    currencies.find((c) => c.code === code) ?? { symbol: code, decimals: 2 };

  useEffect(() => {
    if (!debt) return;
    const inCur = accounts.filter((a) => a.currency_code === debt.currency_code);
    setAccountId(inCur[0]?.id ?? accounts[0]?.id ?? "");
    setRegister(true);
  }, [debt, accounts]);

  if (!debt) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const options = accounts.filter((a) => a.currency_code === debt.currency_code);
  const isIncoming = debt.kind === "they_owe";

  async function settle() {
    if (!debt) return;
    setBusy(true);
    await settleDebt(debt.id, {
      register,
      accountId: register ? accountId : null,
    });
    setBusy(false);
    onDone();
  }

  return (
    <Sheet open={debt !== null} onClose={onClose} title="Saldar deuda">
      <div className="space-y-4">
        <p className="text-center text-2xl font-semibold tnum">
          {formatMoney(debt.amount, curOf(debt.currency_code))}
        </p>
        <p className="text-center text-sm text-text-muted">
          {isIncoming ? "Te paga" : "Le pagás a"} {debt.counterparty}
        </p>

        <button
          type="button"
          onClick={() => setRegister((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-left"
        >
          <span>
            <span className="block text-sm font-medium">
              Registrar el movimiento
            </span>
            <span className="block text-xs text-text-faint">
              {isIncoming
                ? "Suma la plata a una cuenta"
                : "Descuenta la plata de una cuenta"}
            </span>
          </span>
          <span
            className={cn(
              "h-6 w-10 shrink-0 rounded-full p-0.5 transition",
              register ? "bg-accent" : "bg-surface-3",
            )}
          >
            <span
              className={cn(
                "block h-5 w-5 rounded-full bg-bg transition",
                register && "translate-x-4",
              )}
            />
          </span>
        </button>

        {register && (
          <label className="block">
            <span className="mb-1.5 block text-xs text-text-muted">
              {isIncoming ? "¿En qué cuenta entra?" : "¿De qué cuenta sale?"}
            </span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none"
            >
              {(options.length ? options : accounts).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency_code})
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          onClick={settle}
          disabled={busy}
          className="grad-violet h-12 w-full rounded-xl font-semibold text-bg disabled:opacity-60"
        >
          {busy ? "Guardando…" : "Marcar saldada"}
        </button>
      </div>
    </Sheet>
  );
}
