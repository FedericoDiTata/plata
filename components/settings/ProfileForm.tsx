"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/settings";
import type { Currency } from "@/lib/types";

export function ProfileForm({
  displayName,
  baseCurrency,
  currencies,
}: {
  displayName: string;
  baseCurrency: string;
  currencies: Currency[];
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [base, setBase] = useState(baseCurrency);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    await updateProfile({ display_name: name, base_currency: base });
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="card space-y-3 p-4">
      <label className="block">
        <span className="mb-1.5 block text-xs text-text-muted">Tu nombre</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          className="h-11 w-full rounded-xl border border-line bg-surface-2 px-4 outline-none focus:border-accent/50"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs text-text-muted">
          Moneda base (para consolidar tu patrimonio)
        </span>
        <select
          value={base}
          onChange={(e) => {
            setBase(e.target.value);
            setSaved(false);
          }}
          className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none"
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.name}
            </option>
          ))}
        </select>
      </label>
      <button
        onClick={save}
        disabled={busy}
        className="h-11 w-full rounded-xl bg-accent font-semibold text-bg disabled:opacity-60"
      >
        {saved ? "Guardado ✓" : busy ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}
