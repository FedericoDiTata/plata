"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { createGoal } from "@/app/actions/goals";
import type { Currency } from "@/lib/types";

/**
 * Formulario para crear una meta de ahorro, en ventana emergente.
 * Se usa tanto en la página "Metas" como directo desde el inicio.
 */
export function CreateGoalSheet({
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
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [date, setDate] = useState("");
  const [color, setColor] = useState("cat-1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const value = Number(target.replace(",", "."));
    if (!name.trim()) return setError("Poné un nombre.");
    if (!(value > 0)) return setError("Poné un objetivo válido.");
    setBusy(true);
    const res = await createGoal({
      name,
      target_amount: value,
      currency_code: currency,
      target_date: date || null,
      color,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Error");
    setName("");
    setTarget("");
    setDate("");
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nueva meta">
      <div className="space-y-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Viaje, Fondo de emergencia…"
          className="h-12 w-full rounded-xl border border-line bg-surface-2 px-4 outline-none focus:border-accent/50"
        />
        <div className="flex gap-2">
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            inputMode="decimal"
            placeholder="Objetivo"
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
            Fecha objetivo (opcional)
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-surface-2 px-4 outline-none focus:border-accent/50"
          />
        </label>
        <div>
          <span className="mb-2 block text-xs text-text-muted">Color</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
        <button
          onClick={save}
          disabled={busy}
          className="h-12 w-full rounded-xl bg-accent font-semibold text-bg disabled:opacity-60"
        >
          Crear meta
        </button>
      </div>
    </Sheet>
  );
}
