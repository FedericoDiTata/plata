"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Plus, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { formatNumber } from "@/lib/format";
import {
  addCurrency,
  deleteCurrency,
  refreshDolarBlue,
  updateCurrencyRate,
} from "@/app/actions/settings";
import type { Currency } from "@/lib/types";

export function CurrenciesManager({
  currencies,
  baseCurrency,
}: {
  currencies: Currency[];
  baseCurrency: string;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function dolar() {
    setRefreshing(true);
    setMsg(null);
    const res = await refreshDolarBlue();
    setRefreshing(false);
    if (res.ok) setMsg(`Dólar blue: $${formatNumber(res.value ?? 0, 0)}`);
    else setMsg(res.error ?? "Error");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Cotización respecto de tu moneda base ({baseCurrency}).
        </p>
        <button
          onClick={dolar}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-accent disabled:opacity-60"
        >
          <RefreshCw className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Auto dólar
        </button>
      </div>

      {msg && <p className="text-xs text-text-faint">{msg}</p>}

      <div className="card divide-y divide-line">
        {currencies.map((c) => (
          <CurrencyRow
            key={c.id}
            currency={c}
            baseCurrency={baseCurrency}
            onChanged={() => router.refresh()}
          />
        ))}
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-2.5 text-sm font-medium text-text-muted transition active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" /> Agregar moneda
      </button>

      <AddCurrencySheet
        open={addOpen}
        baseCurrency={baseCurrency}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function CurrencyRow({
  currency,
  baseCurrency,
  onChanged,
}: {
  currency: Currency;
  baseCurrency: string;
  onChanged: () => void;
}) {
  const isBase = currency.code === baseCurrency;
  // Mostramos "1 moneda = X base" (ej: 1 USD = 1430 ARS). X = rate directo.
  const [value, setValue] = useState(isBase ? "" : String(currency.rate));
  const [busy, setBusy] = useState(false);

  // Sincroniza el campo cuando cambia la cotización (ej: tras "Auto dólar").
  useEffect(() => {
    if (!isBase) setValue(String(currency.rate));
  }, [currency.rate, isBase]);

  async function commit() {
    if (isBase) return;
    const x = Number(value.replace(",", "."));
    if (!(x > 0)) return;
    setBusy(true);
    await updateCurrencyRate(currency.id, x);
    setBusy(false);
    onChanged();
  }

  async function remove() {
    setBusy(true);
    await deleteCurrency(currency.id);
    setBusy(false);
    onChanged();
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {currency.code}{" "}
          <span className="text-text-faint">{currency.symbol}</span>
        </p>
        <p className="text-xs text-text-faint">{currency.name}</p>
      </div>

      {isBase ? (
        <span className="rounded-full bg-accent/15 px-2 py-1 text-xs font-medium text-accent">
          Base
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-faint">1 {currency.code} =</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            inputMode="decimal"
            className="h-9 w-24 rounded-lg border border-line bg-surface-2 px-2 text-right text-sm tnum outline-none focus:border-accent/50"
          />
          <span className="text-xs text-text-faint">{baseCurrency}</span>
          <button
            onClick={remove}
            disabled={busy}
            className="text-text-faint disabled:opacity-50"
            aria-label="Borrar moneda"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function AddCurrencySheet({
  open,
  baseCurrency,
  onClose,
  onSaved,
}: {
  open: boolean;
  baseCurrency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState("2");
  const [perBase, setPerBase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const x = Number(perBase.replace(",", "."));
    if (!code.trim() || !name.trim() || !symbol.trim())
      return setError("Completá código, nombre y símbolo.");
    if (!(x > 0)) return setError("Poné la cotización.");
    setBusy(true);
    const res = await addCurrency({
      code,
      name,
      symbol,
      decimals: Number(decimals) || 2,
      rate: x,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Error");
    setCode("");
    setName("");
    setSymbol("");
    setPerBase("");
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Agregar moneda">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Código (EUR)"
            className="h-11 rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent/50"
          />
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Símbolo (€)"
            className="h-11 rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent/50"
          />
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (Euro)"
          className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent/50"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            inputMode="numeric"
            placeholder="Decimales"
            className="h-11 rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent/50"
          />
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 px-2">
            <span className="whitespace-nowrap text-xs text-text-faint">
              1 {code || "?"} =
            </span>
            <input
              value={perBase}
              onChange={(e) => setPerBase(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="h-11 w-full bg-transparent text-right text-sm tnum outline-none"
            />
            <span className="text-xs text-text-faint">{baseCurrency}</span>
          </div>
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
        <button
          onClick={save}
          disabled={busy}
          className="h-12 w-full rounded-xl bg-accent font-semibold text-bg disabled:opacity-60"
        >
          Agregar
        </button>
      </div>
    </Sheet>
  );
}
