"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HandCoins, Check, Plus } from "lucide-react";
import { SettleDebtSheet } from "@/components/debts/SettleDebtSheet";
import { currencyRate } from "@/lib/calc";
import { formatMoney, shortDate } from "@/lib/format";
import { colorVar } from "@/lib/colors";
import type { AccountWithBalance, Currency, Debt } from "@/lib/types";

export function DashboardDebts({
  debts,
  accounts,
  currencies,
  base,
}: {
  debts: Debt[];
  accounts: AccountWithBalance[];
  currencies: Currency[];
  base: string;
}) {
  const router = useRouter();
  const baseCur = currencies.find((c) => c.code === base) ?? {
    symbol: base,
    decimals: 2,
  };
  const curOf = (code: string) =>
    currencies.find((c) => c.code === code) ?? { symbol: code, decimals: 2 };
  const [settleDebt, setSettleDebt] = useState<Debt | null>(null);

  const pending = debts.filter((d) => !d.is_settled);
  const theyOwe = pending
    .filter((d) => d.kind === "they_owe")
    .reduce((s, d) => s + d.amount * currencyRate(d.currency_code, currencies), 0);
  const iOwe = pending
    .filter((d) => d.kind === "i_owe")
    .reduce((s, d) => s + d.amount * currencyRate(d.currency_code, currencies), 0);

  return (
    <section className="card flex flex-col p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <HandCoins className="h-5 w-5 text-accent" /> Deudas
        </h2>
        <Link href="/deudas" className="text-xs font-medium text-accent">
          Gestionar
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-text-muted">Te deben</p>
          <p className="text-lg font-semibold tnum text-income">
            {formatMoney(theyOwe, baseCur)}
          </p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-text-muted">Debés</p>
          <p className="text-lg font-semibold tnum text-negative">
            {formatMoney(iOwe, baseCur)}
          </p>
        </div>
      </div>

      {pending.length === 0 ? (
        <Link
          href="/deudas"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-6 text-sm text-text-muted transition hover:text-text"
        >
          <Plus className="h-4 w-4" /> Registrar una deuda
        </Link>
      ) : (
        <div className="divide-y divide-line">
          {pending.slice(0, 6).map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {d.counterparty}
                </span>
                <span className="block text-xs text-text-faint">
                  {d.kind === "they_owe" ? "Te debe" : "Le debés"}
                  {d.due_date ? ` · vence ${shortDate(d.due_date)}` : ""}
                </span>
              </span>
              <span
                className="shrink-0 text-sm font-semibold tnum"
                style={{
                  color: colorVar(d.kind === "they_owe" ? "income" : "negative"),
                }}
              >
                {formatMoney(d.amount, curOf(d.currency_code))}
              </span>
              <button
                onClick={() => setSettleDebt(d)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-muted transition hover:text-income"
                aria-label="Saldar"
                title="Marcar saldada"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <SettleDebtSheet
        debt={settleDebt}
        accounts={accounts}
        currencies={currencies}
        onClose={() => setSettleDebt(null)}
        onDone={() => {
          setSettleDebt(null);
          router.refresh();
        }}
      />
    </section>
  );
}
