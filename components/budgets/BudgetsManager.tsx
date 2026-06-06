"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/format";
import { colorHex, colorSoft, colorVar } from "@/lib/colors";
import { upsertBudget, deleteBudget } from "@/app/actions/budgets";
import type { Budget, Category, Currency } from "@/lib/types";

export function BudgetsManager({
  categories,
  budgets,
  spentBaseByCat,
  currencies,
  baseCurrency,
  month,
}: {
  categories: Category[];
  budgets: Budget[];
  spentBaseByCat: Record<string, number>;
  currencies: Currency[];
  baseCurrency: string;
  month: string;
}) {
  const router = useRouter();
  const budgetByCat = useMemo(
    () => new Map(budgets.map((b) => [b.category_id, b])),
    [budgets],
  );
  const rateOf = (code: string) =>
    currencies.find((c) => c.code === code)?.rate ?? 1;
  const curOf = (code: string) =>
    currencies.find((c) => c.code === code) ?? { symbol: code, decimals: 2 };

  const [editing, setEditing] = useState<Category | null>(null);

  return (
    <>
      <div className="space-y-3">
        {categories.map((cat) => {
          const budget = budgetByCat.get(cat.id);
          const spentBase = spentBaseByCat[cat.id] ?? 0;
          const budgetCur = budget?.currency_code ?? baseCurrency;
          const spent = spentBase / rateOf(budgetCur);
          const limit = budget?.limit_amount ?? 0;
          const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const over = limit > 0 && spent > limit;
          const near = limit > 0 && !over && spent / limit >= 0.8;
          const barColor = over ? "negative" : near ? "warn" : cat.color;

          return (
            <button
              key={cat.id}
              onClick={() => setEditing(cat)}
              className="card flex w-full flex-col gap-2 p-4 text-left transition active:bg-surface-2"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ background: colorSoft(cat.color, 22) }}
                  >
                    <Icon name={cat.icon} className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  {cat.name}
                </span>
                <span className="text-sm tnum text-text-muted">
                  {budget ? (
                    <>
                      {formatMoney(spent, curOf(budgetCur))}
                      <span className="text-text-faint">
                        {" "}
                        / {formatMoney(limit, curOf(budgetCur))}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-accent">Definir límite</span>
                  )}
                </span>
              </div>
              {budget && (
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: colorHex(barColor) }}
                  />
                </div>
              )}
              {over && (
                <p className="text-xs text-negative">
                  Te pasaste por{" "}
                  {formatMoney(spent - limit, curOf(budgetCur))}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <BudgetEditor
        category={editing}
        budget={editing ? budgetByCat.get(editing.id) ?? null : null}
        currencies={currencies}
        baseCurrency={baseCurrency}
        month={month}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </>
  );
}

function BudgetEditor({
  category,
  budget,
  currencies,
  baseCurrency,
  month,
  onClose,
  onSaved,
}: {
  category: Category | null;
  budget: Budget | null;
  currencies: Currency[];
  baseCurrency: string;
  month: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [limit, setLimit] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [busy, setBusy] = useState(false);

  // Reset al abrir
  const open = category !== null;
  useEffect(() => {
    if (category) {
      setLimit(budget ? String(budget.limit_amount) : "");
      setCurrency(budget?.currency_code ?? baseCurrency);
    }
  }, [category, budget, baseCurrency]);

  if (!category) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  async function save() {
    if (!category) return;
    const value = Number(limit.replace(",", "."));
    if (!(value > 0)) return;
    setBusy(true);
    await upsertBudget({
      category_id: category.id,
      month,
      limit_amount: value,
      currency_code: currency,
    });
    setBusy(false);
    onSaved();
  }

  async function remove() {
    if (!budget) return onClose();
    setBusy(true);
    await deleteBudget(budget.id);
    setBusy(false);
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Presupuesto · ${category.name}`}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            autoFocus
            className="h-12 flex-1 rounded-xl border border-line bg-surface-2 px-4 text-lg tnum outline-none focus:border-accent/50"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-12 rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent/50"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-text-faint">
          Límite mensual para {category.name}.
        </p>
        <div className="flex gap-2">
          {budget && (
            <button
              onClick={remove}
              disabled={busy}
              className="h-12 rounded-xl border border-line px-4 text-sm font-medium text-negative disabled:opacity-60"
            >
              Quitar
            </button>
          )}
          <button
            onClick={save}
            disabled={busy}
            className="h-12 flex-1 rounded-xl bg-accent font-semibold text-bg disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
      </div>
    </Sheet>
  );
}
