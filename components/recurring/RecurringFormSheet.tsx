"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { createRecurringRule } from "@/app/actions/recurring";
import { cn } from "@/lib/utils";
import type {
  AccountWithBalance,
  Category,
  IncomeSource,
} from "@/lib/types";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Form para crear un gasto/ingreso fijo. Reutilizable (inicio y pantalla). */
export function RecurringFormSheet({
  open,
  accounts,
  expenseCategories,
  incomeSources,
  onClose,
  onSaved,
}: {
  open: boolean;
  accounts: AccountWithBalance[];
  expenseCategories: Category[];
  incomeSources: IncomeSource[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [frequency, setFrequency] = useState<"monthly" | "weekly">("monthly");
  const [day, setDay] = useState("1");
  const [weekday, setWeekday] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset de defaults cada vez que se abre.
  useEffect(() => {
    if (!open) return;
    setType("expense");
    setAmount("");
    setNote("");
    setError(null);
    setAccountId(accounts[0]?.id ?? "");
    setCategoryId(expenseCategories[0]?.id ?? "");
    setSourceId(incomeSources[0]?.id ?? "");
    setFrequency("monthly");
    setDay("1");
    setWeekday("1");
  }, [open, accounts, expenseCategories, incomeSources]);

  const account = accounts.find((a) => a.id === accountId);

  async function save() {
    setError(null);
    const value = Number(amount.replace(",", "."));
    if (!(value > 0)) return setError("Poné un monto válido.");
    if (!account) return setError("Elegí una cuenta.");
    setBusy(true);
    const res = await createRecurringRule({
      type,
      amount: value,
      currency_code: account.currency_code,
      account_id: accountId,
      category_id: type === "expense" ? categoryId : null,
      income_source_id: type === "income" ? sourceId : null,
      note: note.trim() || null,
      frequency,
      day_of_month: frequency === "monthly" ? Number(day) : null,
      weekday: frequency === "weekly" ? Number(weekday) : null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Error");
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nuevo gasto fijo">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {(
            [
              ["expense", "Gasto"],
              ["income", "Ingreso"],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "h-9 rounded-lg text-sm font-medium transition",
                type === t ? "bg-surface-3 text-text" : "text-text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="Monto"
          autoFocus
          className="h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-lg tnum outline-none focus:border-accent/50"
        />

        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency_code})
            </option>
          ))}
        </select>

        {type === "expense" ? (
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none"
          >
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none"
          >
            {incomeSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-2 gap-2">
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as "monthly" | "weekly")}
            className="h-12 rounded-xl border border-line bg-surface-2 px-3 outline-none"
          >
            <option value="monthly">Cada mes</option>
            <option value="weekly">Cada semana</option>
          </select>

          {frequency === "monthly" ? (
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="h-12 rounded-xl border border-line bg-surface-2 px-3 outline-none"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Día {d}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={weekday}
              onChange={(e) => setWeekday(e.target.value)}
              className="h-12 rounded-xl border border-line bg-surface-2 px-3 outline-none"
            >
              {WEEKDAYS.map((w, i) => (
                <option key={i} value={i}>
                  {w}
                </option>
              ))}
            </select>
          )}
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nombre (ej: Alquiler, Netflix…)"
          className="h-11 w-full rounded-xl border border-line bg-surface-2 px-4 outline-none focus:border-accent/50"
        />

        {error && <p className="text-sm text-negative">{error}</p>}
        <button
          onClick={save}
          disabled={busy}
          className="grad-violet h-12 w-full rounded-xl font-semibold text-bg disabled:opacity-60"
        >
          Crear gasto fijo
        </button>
      </div>
    </Sheet>
  );
}
