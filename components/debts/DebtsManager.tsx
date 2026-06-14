"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Trash2, RotateCcw } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CreateDebtSheet } from "@/components/debts/CreateDebtSheet";
import { formatMoney, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { setDebtSettled, deleteDebt } from "@/app/actions/debts";
import type { Currency, Debt } from "@/lib/types";

export function DebtsManager({
  debts,
  currencies,
  baseCurrency,
}: {
  debts: Debt[];
  currencies: Currency[];
  baseCurrency: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Debt | null>(null);
  const curOf = (code: string) =>
    currencies.find((c) => c.code === code) ?? { symbol: code, decimals: 2 };

  const theyOwe = debts.filter((d) => d.kind === "they_owe" && !d.is_settled);
  const iOwe = debts.filter((d) => d.kind === "i_owe" && !d.is_settled);
  const settled = debts.filter((d) => d.is_settled);

  return (
    <>
      <button
        onClick={() => setCreateOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-3 text-sm font-medium text-text-muted transition active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" /> Nueva deuda
      </button>

      <Group title="Te deben" debts={theyOwe} positive onSelect={setSelected} curOf={curOf} />
      <Group title="Debés" debts={iOwe} onSelect={setSelected} curOf={curOf} />

      {settled.length > 0 && (
        <Group title="Saldadas" debts={settled} muted onSelect={setSelected} curOf={curOf} />
      )}

      <CreateDebtSheet
        open={createOpen}
        currencies={currencies}
        baseCurrency={baseCurrency}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          router.refresh();
        }}
      />

      <DebtDetailSheet
        debt={selected}
        curOf={curOf}
        onClose={() => setSelected(null)}
        onChanged={() => {
          setSelected(null);
          router.refresh();
        }}
      />
    </>
  );
}

function Group({
  title,
  debts,
  positive,
  muted,
  onSelect,
  curOf,
}: {
  title: string;
  debts: Debt[];
  positive?: boolean;
  muted?: boolean;
  onSelect: (d: Debt) => void;
  curOf: (c: string) => { symbol: string; decimals: number };
}) {
  if (debts.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </h2>
      <div className="card divide-y divide-line">
        {debts.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelect(d)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition active:bg-surface-2"
          >
            <span className="min-w-0">
              <span
                className={cn(
                  "block truncate text-sm font-medium",
                  muted && "text-text-faint line-through",
                )}
              >
                {d.counterparty}
              </span>
              {d.due_date && (
                <span className="block text-xs text-text-faint">
                  Vence {shortDate(d.due_date)}
                </span>
              )}
            </span>
            <span
              className={cn(
                "shrink-0 text-sm font-semibold tnum",
                muted ? "text-text-faint" : positive ? "text-accent" : "text-negative",
              )}
            >
              {formatMoney(d.amount, curOf(d.currency_code))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function DebtDetailSheet({
  debt,
  curOf,
  onClose,
  onChanged,
}: {
  debt: Debt | null;
  curOf: (c: string) => { symbol: string; decimals: number };
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!debt) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  async function toggle() {
    if (!debt) return;
    setBusy(true);
    await setDebtSettled(debt.id, !debt.is_settled);
    setBusy(false);
    onChanged();
  }
  async function remove() {
    if (!debt) return;
    setBusy(true);
    await deleteDebt(debt.id);
    setBusy(false);
    onChanged();
  }

  return (
    <Sheet open={debt !== null} onClose={onClose} title={debt.counterparty}>
      <div className="space-y-4">
        <p className="text-center text-2xl font-semibold tnum">
          {formatMoney(debt.amount, curOf(debt.currency_code))}
        </p>
        <p className="text-center text-sm text-text-muted">
          {debt.kind === "they_owe" ? "Te deben" : "Debés"}
          {debt.note ? ` · ${debt.note}` : ""}
        </p>
        <button
          onClick={toggle}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-bg disabled:opacity-60"
        >
          {debt.is_settled ? (
            <>
              <RotateCcw className="h-4 w-4" /> Reabrir
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Marcar saldada
            </>
          )}
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 py-2 text-sm text-negative"
        >
          <Trash2 className="h-4 w-4" /> Borrar
        </button>
      </div>
    </Sheet>
  );
}
