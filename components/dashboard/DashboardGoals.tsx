"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Target, Check, Plus } from "lucide-react";
import { toggleGoalDone } from "@/app/actions/goals";
import { CreateGoalSheet } from "@/components/goals/CreateGoalSheet";
import { GoalContributeSheet } from "@/components/goals/GoalContributeSheet";
import { formatMoney, shortDate } from "@/lib/format";
import { colorHex, colorSoft, colorVar } from "@/lib/colors";
import type {
  AccountWithBalance,
  Currency,
  Goal,
  GoalContribution,
} from "@/lib/types";

export function DashboardGoals({
  goals,
  contributions,
  accounts,
  currencies,
  base,
}: {
  goals: Goal[];
  contributions: GoalContribution[];
  accounts: AccountWithBalance[];
  currencies: Currency[];
  base: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const curOf = (code: string) =>
    currencies.find((c) => c.code === code) ?? { symbol: code, decimals: 2 };

  const monthKey = new Date().toISOString().slice(0, 7);
  const savedThisMonth = new Map<string, number>();
  for (const c of contributions) {
    if (c.occurred_on.slice(0, 7) === monthKey) {
      savedThisMonth.set(c.goal_id, (savedThisMonth.get(c.goal_id) ?? 0) + c.amount);
    }
  }

  const active = goals.filter((g) => !g.is_done);
  const done = goals.filter((g) => g.is_done);
  const [busy, setBusy] = useState<string | null>(null);
  const [contribGoal, setContribGoal] = useState<Goal | null>(null);

  async function complete(id: string) {
    setBusy(id);
    await toggleGoalDone(id, true);
    setBusy(null);
    router.refresh();
  }

  return (
    <section className="card flex flex-col p-5 lg:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Target className="h-5 w-5 text-accent" /> Ahorros
        </h2>
        <Link href="/metas" className="text-xs font-medium text-accent">
          Gestionar
        </Link>
      </div>

      {active.length === 0 && done.length === 0 ? (
        <button
          onClick={() => setCreateOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-8 text-sm text-text-muted transition hover:text-text"
        >
          <Plus className="h-4 w-4" /> Creá tu primera meta
        </button>
      ) : (
        <div className="flex flex-1 flex-col gap-5">
          {active.map((g) => {
            const pct = Math.min((g.current_amount / g.target_amount) * 100, 100);
            const month = savedThisMonth.get(g.id) ?? 0;
            return (
              <div key={g.id}>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-right text-sm tnum">
                    <span className="font-semibold">
                      {formatMoney(g.current_amount, curOf(g.currency_code))}
                    </span>
                    <span className="block text-xs text-text-faint">
                      de {formatMoney(g.target_amount, curOf(g.currency_code))}
                    </span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: colorHex(g.color) }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-text-faint">
                    {pct.toFixed(0)}%
                    {month > 0 && (
                      <span className="text-income">
                        {"  ·  +"}
                        {formatMoney(month, curOf(g.currency_code))} este mes
                      </span>
                    )}
                    {g.target_date && <span>{"  ·  "}meta {shortDate(g.target_date)}</span>}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setContribGoal(g)}
                      className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-medium text-text-muted transition hover:text-text"
                    >
                      + Aportar
                    </button>
                    <button
                      onClick={() => complete(g.id)}
                      disabled={busy === g.id}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-income transition hover:opacity-80 disabled:opacity-50"
                      style={{ background: colorSoft("income", 16) }}
                    >
                      <Check className="h-3.5 w-3.5" /> Cumplí
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {done.length > 0 && (
            <div className="mt-auto border-t border-line pt-3">
              <p className="mb-2 text-xs font-medium text-text-faint">Cumplidas</p>
              <div className="space-y-1.5">
                {done.map((g) => (
                  <div key={g.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-text-muted">
                      <Check className="h-4 w-4 text-income" />
                      {g.name}
                    </span>
                    <span className="tnum text-text-faint">
                      {formatMoney(g.target_amount, curOf(g.currency_code))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong py-2.5 text-sm font-medium text-text-muted transition hover:text-text"
          >
            <Plus className="h-4 w-4" /> Nueva meta
          </button>
        </div>
      )}

      <GoalContributeSheet
        goal={contribGoal}
        contributions={contributions}
        accounts={accounts}
        currencies={currencies}
        onClose={() => setContribGoal(null)}
        onDone={() => {
          setContribGoal(null);
          router.refresh();
        }}
      />

      <CreateGoalSheet
        open={createOpen}
        currencies={currencies}
        baseCurrency={base}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          router.refresh();
        }}
      />
    </section>
  );
}
