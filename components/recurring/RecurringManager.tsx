"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { formatMoney, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteRecurringRule,
  toggleRecurringRule,
} from "@/app/actions/recurring";
import { RecurringFormSheet } from "@/components/recurring/RecurringFormSheet";
import type {
  AccountWithBalance,
  Category,
  Currency,
  IncomeSource,
  RecurringRule,
} from "@/lib/types";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function RecurringManager({
  rules,
  accounts,
  expenseCategories,
  incomeSources,
  currencies,
}: {
  rules: RecurringRule[];
  accounts: AccountWithBalance[];
  expenseCategories: Category[];
  incomeSources: IncomeSource[];
  currencies: Currency[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const curOf = (code: string) =>
    currencies.find((c) => c.code === code) ?? { symbol: code, decimals: 2 };
  const catName = (id: string | null) =>
    expenseCategories.find((c) => c.id === id)?.name;
  const srcName = (id: string | null) =>
    incomeSources.find((s) => s.id === id)?.name;

  async function toggle(r: RecurringRule) {
    await toggleRecurringRule(r.id, !r.is_active);
    router.refresh();
  }
  async function remove(id: string) {
    await deleteRecurringRule(id);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-3 text-sm font-medium text-text-muted transition active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" /> Nuevo gasto fijo
      </button>

      {rules.length === 0 ? (
        <div className="card px-6 py-10 text-center text-text-muted">
          Cargá tus gastos fijos (alquiler, suscripciones…) y pagalos con un toque
          cada período.
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.id} className="card flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {r.note ||
                    (r.type === "expense"
                      ? catName(r.category_id) ?? "Gasto"
                      : srcName(r.income_source_id) ?? "Ingreso")}
                </p>
                <p className="text-xs text-text-faint">
                  {r.frequency === "monthly"
                    ? `Cada mes${r.day_of_month ? ` (día ${r.day_of_month})` : ""}`
                    : `Cada semana${r.weekday != null ? ` (${WEEKDAYS[r.weekday]})` : ""}`}{" "}
                  · próx. {shortDate(r.next_run)}
                </p>
              </div>
              <span
                className={cn(
                  "text-sm font-semibold tnum",
                  r.type === "income" ? "text-income" : "text-negative",
                )}
              >
                {formatMoney(r.amount, curOf(r.currency_code))}
              </span>
              <button
                onClick={() => toggle(r)}
                className={cn(
                  "h-6 w-10 shrink-0 rounded-full p-0.5 transition",
                  r.is_active ? "bg-accent" : "bg-surface-3",
                )}
                aria-label="Activar/pausar"
              >
                <span
                  className={cn(
                    "block h-5 w-5 rounded-full bg-bg transition",
                    r.is_active && "translate-x-4",
                  )}
                />
              </button>
              <button
                onClick={() => remove(r.id)}
                className="text-text-faint"
                aria-label="Borrar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <RecurringFormSheet
        open={open}
        accounts={accounts}
        expenseCategories={expenseCategories}
        incomeSources={incomeSources}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
