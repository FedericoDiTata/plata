"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";
import { createDebt } from "@/app/actions/debts";
import type { Currency, DebtKind } from "@/lib/types";

/**
 * Formulario para crear una deuda nueva, en ventana emergente.
 * Se usa tanto en la página "Deudas" como directo desde el inicio.
 */
export function CreateDebtSheet({
  open,
  currencies,
  baseCurrency,
  onClose,
  onSaved,
}: {
  open: boolean;
  currencies: Currency[];
  baseCurrency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<DebtKind>("they_owe");
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const value = Number(amount.replace(",", "."));
    if (!counterparty.trim()) return setError("¿Quién?");
    if (!(value > 0)) return setError("Poné un monto válido.");
    setBusy(true);
    const res = await createDebt({
      kind,
      counterparty,
      amount: value,
      currency_code: currency,
      due_date: date || null,
      note: note.trim() || null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Error");
    setCounterparty("");
    setAmount("");
    setNote("");
    setDate("");
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nueva deuda">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {(
            [
              ["they_owe", "Me deben"],
              ["i_owe", "Yo debo"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "h-9 rounded-lg text-sm font-medium transition",
                kind === k ? "bg-surface-3 text-text" : "text-text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
          placeholder="Nombre (a quién / de quién)"
          className="h-12 w-full rounded-xl border border-line bg-surface-2 px-4 outline-none focus:border-accent/50"
        />
        <div className="flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Monto"
            className="h-12 flex-1 rounded-xl border border-line bg-surface-2 px-4 text-lg tnum outline-none focus:border-accent/50"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-12 rounded-xl border border-line bg-surface-2 px-3 outline-none"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs text-text-muted">
            Vencimiento (opcional)
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-surface-2 px-4 outline-none focus:border-accent/50"
          />
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          className="h-11 w-full rounded-xl border border-line bg-surface-2 px-4 outline-none focus:border-accent/50"
        />
        {error && <p className="text-sm text-negative">{error}</p>}
        <button
          onClick={save}
          disabled={busy}
          className="h-12 w-full rounded-xl bg-accent font-semibold text-bg disabled:opacity-60"
        >
          Guardar
        </button>
      </div>
    </Sheet>
  );
}
