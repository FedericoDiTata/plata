"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Repeat, Check, Plus } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { payRecurring } from "@/app/actions/recurring";
import { RecurringFormSheet } from "@/components/recurring/RecurringFormSheet";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AccountWithBalance,
  Category,
  Currency,
  IncomeSource,
  RecurringRule,
} from "@/lib/types";

export function DashboardRecurring({
  rules,
  accounts,
  categories,
  incomeSources,
  paidIds,
  currencies,
}: {
  rules: RecurringRule[];
  accounts: AccountWithBalance[];
  categories: Category[];
  incomeSources: IncomeSource[];
  paidIds: string[];
  currencies: Currency[];
}) {
  const router = useRouter();
  const curOf = (code: string) =>
    currencies.find((c) => c.code === code) ?? { symbol: code, decimals: 2 };
  const catName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name;
  const srcName = (id: string | null) =>
    incomeSources.find((s) => s.id === id)?.name;

  const active = rules.filter((r) => r.is_active);
  const paid = new Set(paidIds);
  const [payRule, setPayRule] = useState<RecurringRule | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const expenseCategories = categories.filter((c) => c.kind === "expense");

  function label(r: RecurringRule) {
    return (
      r.note ||
      (r.type === "expense"
        ? catName(r.category_id) ?? "Gasto fijo"
        : srcName(r.income_source_id) ?? "Ingreso fijo")
    );
  }

  return (
    <section className="card flex flex-col p-5 lg:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Repeat className="h-5 w-5 text-accent" /> Gastos fijos
        </h2>
        <Link href="/gastos-fijos" className="text-xs font-medium text-accent">
          Gestionar
        </Link>
      </div>

      {active.length === 0 ? (
        <button
          onClick={() => setFormOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-8 text-sm text-text-muted transition hover:text-text"
        >
          <Plus className="h-4 w-4" /> Agregar un gasto fijo
        </button>
      ) : (
        <div className="divide-y divide-line">
          {active.map((r) => {
            const isPaid = paid.has(r.id);
            return (
              <div key={r.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {label(r)}
                  </span>
                  <span className="block text-xs text-text-faint">
                    {r.frequency === "monthly" ? "Mensual" : "Semanal"}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tnum",
                    r.type === "income" ? "text-income" : "text-negative",
                  )}
                >
                  {formatMoney(r.amount, curOf(r.currency_code))}
                </span>
                {isPaid ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-lg bg-income-soft px-2 py-1 text-xs font-medium text-income">
                    <Check className="h-3 w-3" /> Pago
                  </span>
                ) : (
                  <button
                    onClick={() => setPayRule(r)}
                    className="shrink-0 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium text-accent transition hover:opacity-80"
                  >
                    Pagar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {active.length > 0 && (
        <button
          onClick={() => setFormOpen(true)}
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong py-2.5 text-sm font-medium text-text-muted transition hover:text-text"
        >
          <Plus className="h-4 w-4" /> Nuevo gasto fijo
        </button>
      )}

      <PaySheet
        rule={payRule}
        accounts={accounts}
        currencies={currencies}
        onClose={() => setPayRule(null)}
        onPaid={() => {
          setPayRule(null);
          router.refresh();
        }}
      />

      <RecurringFormSheet
        open={formOpen}
        accounts={accounts}
        expenseCategories={expenseCategories}
        incomeSources={incomeSources}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          router.refresh();
        }}
      />
    </section>
  );
}

function PaySheet({
  rule,
  accounts,
  currencies,
  onClose,
  onPaid,
}: {
  rule: RecurringRule | null;
  accounts: AccountWithBalance[];
  currencies: Currency[];
  onClose: () => void;
  onPaid: () => void;
}) {
  const [accountId, setAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const curOf = (code: string) =>
    currencies.find((c) => c.code === code) ?? { symbol: code, decimals: 2 };

  if (!rule) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  // Cuentas en la misma moneda que el gasto fijo (mejor para que el saldo cuadre).
  const options = accounts.filter((a) => a.currency_code === rule.currency_code);
  const selected = accountId || rule.account_id || options[0]?.id || "";

  async function pay() {
    if (!rule || !selected) return;
    setBusy(true);
    await payRecurring(rule.id, selected);
    setBusy(false);
    onPaid();
  }

  return (
    <Sheet open={rule !== null} onClose={onClose} title="Pagar gasto fijo">
      <div className="space-y-4">
        <p className="text-center text-2xl font-semibold tnum">
          {formatMoney(rule.amount, curOf(rule.currency_code))}
        </p>
        <label className="block">
          <span className="mb-1.5 block text-xs text-text-muted">
            ¿De qué cuenta se debita?
          </span>
          <select
            value={selected}
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
        <button
          onClick={pay}
          disabled={busy || !selected}
          className="grad-violet h-12 w-full rounded-xl font-semibold text-bg disabled:opacity-60"
        >
          {busy ? "Registrando…" : "Registrar pago"}
        </button>
      </div>
    </Sheet>
  );
}
