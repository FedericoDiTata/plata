"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import {
  contributeGoal,
  deleteGoal,
  toggleGoalDone,
} from "@/app/actions/goals";
import { createTransaction } from "@/app/actions/transactions";
import { formatMoney, shortDate, todayISO } from "@/lib/format";
import { colorHex, colorVar } from "@/lib/colors";
import { cn } from "@/lib/utils";
import type {
  AccountWithBalance,
  Currency,
  Goal,
  GoalContribution,
} from "@/lib/types";

/**
 * Sheet completo de una meta: aportar/retirar (con opción de mover plata real),
 * historial de aportes, marcar cumplida y borrar.
 */
export function GoalContributeSheet({
  goal,
  contributions,
  accounts,
  currencies,
  onClose,
  onDone,
}: {
  goal: Goal | null;
  contributions: GoalContribution[];
  accounts: AccountWithBalance[];
  currencies: Currency[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [moveMoney, setMoveMoney] = useState(false);
  const [busy, setBusy] = useState(false);
  const curOf = (code: string) =>
    currencies.find((c) => c.code === code) ?? { symbol: code, decimals: 2 };

  useEffect(() => {
    if (!goal) return;
    const inCur = accounts.filter((a) => a.currency_code === goal.currency_code);
    const savings = inCur.find((a) => /ahorro|saving/i.test(a.name));
    setFromAccountId(inCur.find((a) => a.id !== savings?.id)?.id ?? inCur[0]?.id ?? "");
    setToAccountId(savings?.id ?? inCur.find((a) => a.id !== inCur[0]?.id)?.id ?? "");
    setAmount("");
    setMoveMoney(false);
  }, [goal, accounts]);

  if (!goal) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const cur = curOf(goal.currency_code);
  const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  const accountsInCur = accounts.filter((a) => a.currency_code === goal.currency_code);
  const canTransfer =
    moveMoney &&
    accountsInCur.length >= 2 &&
    !!fromAccountId &&
    !!toAccountId &&
    fromAccountId !== toAccountId;

  const goalContribs = contributions
    .filter((c) => c.goal_id === goal.id)
    .slice(0, 10);
  const monthKey = new Date().toISOString().slice(0, 7);
  const thisMonth = contributions
    .filter((c) => c.goal_id === goal.id && c.occurred_on.slice(0, 7) === monthKey)
    .reduce((s, c) => s + c.amount, 0);

  async function move(sign: 1 | -1) {
    if (!goal) return;
    const raw = Number(amount.replace(",", "."));
    if (!(raw > 0)) return;
    setBusy(true);
    if (canTransfer) {
      await createTransaction({
        type: "transfer",
        amount: raw,
        currency_code: goal.currency_code,
        account_id: sign === 1 ? fromAccountId : toAccountId,
        to_account_id: sign === 1 ? toAccountId : fromAccountId,
        occurred_on: todayISO(),
      });
    }
    await contributeGoal(goal.id, raw * sign);
    setBusy(false);
    onDone();
  }

  async function markDone() {
    if (!goal) return;
    setBusy(true);
    await toggleGoalDone(goal.id, !goal.is_done);
    setBusy(false);
    onDone();
  }

  async function remove() {
    if (!goal) return;
    setBusy(true);
    await deleteGoal(goal.id);
    setBusy(false);
    onDone();
  }

  return (
    <Sheet open={goal !== null} onClose={onClose} title={goal.name}>
      <div className="space-y-4">
        {/* Progreso */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-lg font-semibold tnum">
              {formatMoney(goal.current_amount, cur)}
            </span>
            <span className="text-sm text-text-faint">
              de {formatMoney(goal.target_amount, cur)} · {pct.toFixed(0)}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: colorHex(goal.color) }}
            />
          </div>
        </div>

        {/* Monto */}
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-3">
          <span className="text-2xl text-text-faint">{cur.symbol}</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="w-full bg-transparent text-3xl font-semibold tnum outline-none placeholder:text-text-faint"
          />
        </div>

        {/* Interruptor: mover plata de verdad o solo registrar */}
        <button
          type="button"
          onClick={() => setMoveMoney((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-left"
        >
          <span>
            <span className="block text-sm font-medium">Mover plata entre cuentas</span>
            <span className="block text-xs text-text-faint">
              {moveMoney
                ? "Transfiere de una cuenta a tu ahorro"
                : "Solo registra el avance (la plata sigue en tus cuentas)"}
            </span>
          </span>
          <span
            className={cn(
              "h-6 w-10 shrink-0 rounded-full p-0.5 transition",
              moveMoney ? "bg-accent" : "bg-surface-3",
            )}
          >
            <span
              className={cn(
                "block h-5 w-5 rounded-full bg-bg transition",
                moveMoney && "translate-x-4",
              )}
            />
          </span>
        </button>

        {moveMoney &&
          (accountsInCur.length >= 2 ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] text-text-faint">Desde</span>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-surface-2 px-2 text-sm outline-none"
                >
                  {accountsInCur.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] text-text-faint">A (ahorro)</span>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-surface-2 px-2 text-sm outline-none"
                >
                  {accountsInCur.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
              Necesitás 2 cuentas en {goal.currency_code} (ej: una normal y una
              "Ahorros {goal.currency_code}") para mover la plata. Creala en Cuentas.
            </p>
          ))}

        <div className="flex gap-2">
          <button
            onClick={() => move(-1)}
            disabled={busy}
            className="h-12 flex-1 rounded-xl border border-line font-medium text-text-muted disabled:opacity-60"
          >
            Retirar
          </button>
          <button
            onClick={() => move(1)}
            disabled={busy}
            className="grad-violet h-12 flex-1 rounded-xl font-semibold text-bg disabled:opacity-60"
          >
            {busy ? "Guardando…" : "Aportar"}
          </button>
        </div>

        {/* Historial */}
        {goalContribs.length > 0 && (
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-text-muted">Aportes</span>
              {thisMonth > 0 && (
                <span className="text-income">
                  +{formatMoney(thisMonth, cur)} este mes
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {goalContribs.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className="text-text-faint">{shortDate(c.occurred_on)}</span>
                  <span
                    className="tnum"
                    style={{ color: colorVar(c.amount >= 0 ? "income" : "negative") }}
                  >
                    {c.amount >= 0 ? "+" : "−"}
                    {formatMoney(Math.abs(c.amount), cur)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 border-t border-line pt-3">
          <button
            onClick={markDone}
            disabled={busy}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium text-income disabled:opacity-60"
            style={{ background: `color-mix(in srgb, ${colorHex("income")} 14%, transparent)` }}
          >
            {goal.is_done ? (
              <>
                <RotateCcw className="h-4 w-4" /> Reabrir
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Marcar cumplida
              </>
            )}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-medium text-negative disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" /> Borrar
          </button>
        </div>
      </div>
    </Sheet>
  );
}
