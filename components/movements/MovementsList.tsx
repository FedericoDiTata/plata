"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { formatMoney, dayHeader } from "@/lib/format";
import { colorSoft, colorVar } from "@/lib/colors";
import { cn } from "@/lib/utils";
import {
  deleteTransaction,
  updateTransaction,
} from "@/app/actions/transactions";
import type {
  Account,
  Category,
  Currency,
  IncomeSource,
  Transaction,
} from "@/lib/types";

export function MovementsList({
  transactions,
  categories,
  accounts,
  incomeSources,
  currencies,
}: {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  incomeSources: IncomeSource[];
  currencies: Currency[];
}) {
  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const acctById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const srcById = useMemo(
    () => new Map(incomeSources.map((s) => [s.id, s])),
    [incomeSources],
  );
  const curByCode = useMemo(
    () => new Map(currencies.map((c) => [c.code, c])),
    [currencies],
  );

  const [selected, setSelected] = useState<Transaction | null>(null);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Filtra por texto (nota/categoría/fuente/cuenta) y por rango de fechas.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (from && t.occurred_on < from) return false;
      if (to && t.occurred_on > to) return false;
      if (!q) return true;
      const cat = t.category_id ? catById.get(t.category_id)?.name ?? "" : "";
      const src = t.income_source_id
        ? srcById.get(t.income_source_id)?.name ?? ""
        : "";
      const acct = t.account_id ? acctById.get(t.account_id)?.name ?? "" : "";
      const hay = `${t.note ?? ""} ${cat} ${src} ${acct} ${t.amount}`.toLowerCase();
      return hay.includes(q);
    });
  }, [transactions, query, from, to, catById, srcById, acctById]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const arr = map.get(t.occurred_on) ?? [];
      arr.push(t);
      map.set(t.occurred_on, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <>
      {/* Buscador + filtro de fechas */}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nota, categoría, cuenta…"
          className="h-11 flex-1 rounded-xl border border-line bg-surface-2 px-4 text-sm outline-none placeholder:text-text-faint focus:border-accent/50"
        />
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 px-2 text-xs text-text-muted">
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="h-11 bg-transparent text-text outline-none [color-scheme:dark]"
          />
          <span className="text-text-faint">→</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 bg-transparent text-text outline-none [color-scheme:dark]"
          />
          {(from || to || query) && (
            <button
              onClick={() => {
                setFrom("");
                setTo("");
                setQuery("");
              }}
              className="px-2 text-text-faint transition hover:text-text"
              aria-label="Limpiar filtros"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card px-6 py-12 text-center text-text-muted">
          {transactions.length === 0
            ? "Todavía no hay movimientos."
            : "No hay resultados para ese filtro."}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([date, items]) => (
          <div key={date}>
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-text-faint">
              {dayHeader(date)}
            </p>
            <div className="card divide-y divide-line">
              {items.map((t) => {
                const cat = t.category_id ? catById.get(t.category_id) : null;
                const src = t.income_source_id
                  ? srcById.get(t.income_source_id)
                  : null;
                const acct = t.account_id ? acctById.get(t.account_id) : null;
                const toAcct = t.to_account_id
                  ? acctById.get(t.to_account_id)
                  : null;
                const cur = curByCode.get(t.currency_code) ?? {
                  symbol: t.currency_code,
                  decimals: 2,
                };

                const color =
                  t.type === "transfer"
                    ? "info"
                    : cat?.color ?? src?.color ?? "cat-12";
                const icon =
                  t.type === "transfer"
                    ? "rotate-ccw"
                    : cat?.icon ?? "banknote";
                const title =
                  t.type === "transfer"
                    ? "Transferencia"
                    : cat?.name ?? src?.name ?? "Movimiento";
                const subtitle =
                  t.type === "transfer"
                    ? `${acct?.name ?? "?"} → ${toAcct?.name ?? "?"}`
                    : t.note || src?.name || acct?.name || "";

                const sign =
                  t.type === "income" ? "+" : t.type === "expense" ? "−" : "";
                const amountColor =
                  t.type === "income"
                    ? "income"
                    : t.type === "expense"
                      ? "negative"
                      : "info";

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-surface-2"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ background: colorSoft(color, 20) }}
                    >
                      <Icon name={icon} className="h-4.5 w-4.5" strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {title}
                      </span>
                      {subtitle && (
                        <span className="block truncate text-xs text-text-faint">
                          {subtitle}
                        </span>
                      )}
                    </span>
                    <span
                      className="shrink-0 text-sm font-semibold tnum"
                      style={{ color: colorVar(amountColor) }}
                    >
                      {sign}
                      {formatMoney(t.amount, cur)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        </div>
      )}

      <MovementDetail
        tx={selected}
        currencies={currencies}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function MovementDetail({
  tx,
  currencies,
  onClose,
}: {
  tx: Transaction | null;
  currencies: Currency[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  // Sincroniza los campos cuando se abre con un movimiento distinto.
  const open = tx !== null;
  useEffect(() => {
    if (tx) {
      setAmount(String(tx.amount));
      setNote(tx.note ?? "");
      setDate(tx.occurred_on);
    }
  }, [tx]);

  if (!tx) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const cur =
    currencies.find((c) => c.code === tx.currency_code) ?? {
      symbol: tx.currency_code,
      decimals: 2,
    };

  async function save() {
    if (!tx) return;
    setBusy(true);
    await updateTransaction(tx.id, {
      type: tx.type,
      amount: Number(amount.replace(",", ".")) || tx.amount,
      currency_code: tx.currency_code,
      account_id: tx.account_id,
      to_account_id: tx.to_account_id,
      category_id: tx.category_id,
      income_source_id: tx.income_source_id,
      note: note.trim() || null,
      occurred_on: date,
    });
    setBusy(false);
    onClose();
    router.refresh();
  }

  async function remove() {
    if (!tx) return;
    setBusy(true);
    await deleteTransaction(tx.id);
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Movimiento">
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-text-muted">
            Monto ({cur.symbol})
          </span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-lg tnum outline-none focus:border-accent/50"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-text-muted">
            Nota
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-surface-2 px-4 outline-none focus:border-accent/50"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-text-muted">
            Fecha
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-surface-2 px-4 outline-none focus:border-accent/50"
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            onClick={remove}
            disabled={busy}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-medium text-negative transition active:scale-95 disabled:opacity-60",
            )}
          >
            <Trash2 className="h-4 w-4" /> Borrar
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-accent font-semibold text-bg transition active:scale-[0.98] disabled:opacity-60"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </Sheet>
  );
}
