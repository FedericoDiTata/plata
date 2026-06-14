"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Target } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { formatMoney, shortDate, todayISO } from "@/lib/format";
import { colorHex, colorSoft, colorVar } from "@/lib/colors";
import { contributeGoal, deleteGoal } from "@/app/actions/goals";
import { createTransaction } from "@/app/actions/transactions";
import { CreateGoalSheet } from "@/components/goals/CreateGoalSheet";
import { GoalContributeSheet } from "@/components/goals/GoalContributeSheet";
import type {
  AccountWithBalance,
  Currency,
  Goal,
  GoalContribution,
} from "@/lib/types";

export function GoalsManager({
  goals,
  contributions,
  accounts,
  currencies,
  baseCurrency,
}: {
  goals: Goal[];
  contributions: GoalContribution[];
  accounts: AccountWithBalance[];
  currencies: Currency[];
  baseCurrency: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Goal | null>(null);
  const curOf = (code: string) =>
    currencies.find((c) => c.code === code) ?? { symbol: code, decimals: 2 };

  return (
    <>
      <button
        onClick={() => setCreateOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-3 text-sm font-medium text-text-muted transition active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" /> Nueva meta
      </button>

      {goals.length === 0 ? (
        <div className="card px-6 py-10 text-center text-text-muted">
          Creá tu primera meta de ahorro 🎯
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const pct = Math.min((g.current_amount / g.target_amount) * 100, 100);
            return (
              <button
                key={g.id}
                onClick={() => setSelected(g)}
                className="card flex w-full flex-col gap-2 p-4 text-left transition active:bg-surface-2"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full"
                      style={{ background: colorSoft(g.color, 22) }}
                    >
                      <Target
                        className="h-4 w-4"
                        style={{ color: colorVar(g.color) }}
                      />
                    </span>
                    {g.name}
                  </span>
                  {g.is_done && <span className="text-xs text-accent">✓ Lograda</span>}
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: colorHex(g.color) }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm tnum">
                  <span className="font-medium">
                    {formatMoney(g.current_amount, curOf(g.currency_code))}
                  </span>
                  <span className="text-text-faint">
                    de {formatMoney(g.target_amount, curOf(g.currency_code))}
                  </span>
                </div>
                {g.target_date && (
                  <p className="text-xs text-text-faint">
                    Objetivo: {shortDate(g.target_date)}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      <CreateGoalSheet
        open={createOpen}
        currencies={currencies}
        baseCurrency={baseCurrency}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          router.refresh();
        }}
      />

      <GoalContributeSheet
        goal={selected}
        contributions={contributions}
        accounts={accounts}
        currencies={currencies}
        onClose={() => setSelected(null)}
        onDone={() => {
          setSelected(null);
          router.refresh();
        }}
      />
    </>
  );
}

function GoalDetailSheet({
  goal,
  contributions,
  accounts,
  currencies,
  onClose,
  onChanged,
}: {
  goal: Goal | null;
  contributions: GoalContribution[];
  accounts: AccountWithBalance[];
  currencies: Currency[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const curOf = (code: string) =>
    currencies.find((c) => c.code === code) ?? { symbol: code, decimals: 2 };

  // Defaults de cuentas según la moneda de la meta.
  useEffect(() => {
    if (!goal) return;
    const inCur = accounts.filter((a) => a.currency_code === goal.currency_code);
    const savings = inCur.find((a) => /ahorro|saving/i.test(a.name));
    setFromAccountId(
      inCur.find((a) => a.id !== savings?.id)?.id ?? inCur[0]?.id ?? "",
    );
    setToAccountId(
      savings?.id ?? inCur.find((a) => a.id !== inCur[0]?.id)?.id ?? "",
    );
    setAmount("");
  }, [goal, accounts]);

  if (!goal) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const goalContribs = contributions
    .filter((c) => c.goal_id === goal.id)
    .slice(0, 10);
  const monthKey = new Date().toISOString().slice(0, 7);
  const thisMonth = contributions
    .filter((c) => c.goal_id === goal.id && c.occurred_on.slice(0, 7) === monthKey)
    .reduce((s, c) => s + c.amount, 0);
  const cur = curOf(goal.currency_code);

  const accountsInCur = accounts.filter(
    (a) => a.currency_code === goal.currency_code,
  );
  const canTransfer =
    accountsInCur.length >= 2 &&
    !!fromAccountId &&
    !!toAccountId &&
    fromAccountId !== toAccountId;

  async function move(sign: 1 | -1) {
    if (!goal) return;
    const raw = Number(amount.replace(",", "."));
    if (!(raw > 0)) return;
    setBusy(true);
    // Mueve plata de verdad: transferencia entre tus cuentas (no es gasto).
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
    setAmount("");
    onChanged();
  }

  async function remove() {
    if (!goal) return;
    setBusy(true);
    await deleteGoal(goal.id);
    setBusy(false);
    onChanged();
  }

  return (
    <Sheet open={goal !== null} onClose={onClose} title={goal.name}>
      <div className="space-y-4">
        <p className="text-center text-sm text-text-muted">
          {formatMoney(goal.current_amount, curOf(goal.currency_code))} de{" "}
          {formatMoney(goal.target_amount, curOf(goal.currency_code))}
        </p>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="Monto"
          autoFocus
          className="h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-center text-lg tnum outline-none focus:border-accent/50"
        />

        {/* Mover plata de verdad entre cuentas */}
        {accountsInCur.length >= 2 ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] text-text-faint">Desde</span>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="h-10 w-full rounded-xl border border-line bg-surface-2 px-2 text-sm outline-none"
              >
                {accountsInCur.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-text-faint">
                A (ahorro)
              </span>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="h-10 w-full rounded-xl border border-line bg-surface-2 px-2 text-sm outline-none"
              >
                {accountsInCur.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-text-faint">
            Tip: creá una cuenta de ahorro en {goal.currency_code} para que el
            aporte mueva la plata entre tus cuentas. Por ahora solo registra el
            progreso.
          </p>
        )}

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
            Aportar
          </button>
        </div>

        {/* Historial de aportes */}
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
                <div
                  key={c.id}
                  className="flex items-center justify-between text-xs"
                >
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

        <button
          onClick={remove}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 py-2 text-sm text-negative"
        >
          <Trash2 className="h-4 w-4" /> Borrar meta
        </button>
      </div>
    </Sheet>
  );
}
