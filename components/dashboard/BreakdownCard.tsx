"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { txInBase } from "@/lib/calc";
import { formatMoney, shortDate } from "@/lib/format";
import { colorHex, colorSoft } from "@/lib/colors";
import { cn } from "@/lib/utils";
import type {
  Account,
  Category,
  Currency,
  IncomeSource,
  Transaction,
} from "@/lib/types";

interface Slice {
  key: string;
  label: string;
  color: string;
  icon: string;
  total: number;
  txs: Transaction[];
}

/**
 * Tarjeta de desglose con dona + lista desplegable. Sirve para gastos (por
 * categoría) y para ingresos (por fuente), según `kind`.
 */
export function BreakdownCard({
  title,
  emptyText,
  kind,
  transactions,
  categories,
  incomeSources,
  accounts,
  currencies,
  base,
}: {
  title: string;
  emptyText: string;
  kind: "expense" | "income";
  transactions: Transaction[];
  categories: Category[];
  incomeSources: IncomeSource[];
  accounts: Account[];
  currencies: Currency[];
  base: string;
}) {
  const baseCur = currencies.find((c) => c.code === base) ?? {
    symbol: base,
    decimals: 2,
  };
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const srcById = useMemo(
    () => new Map(incomeSources.map((s) => [s.id, s])),
    [incomeSources],
  );
  const acctById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const curByCode = useMemo(
    () => new Map(currencies.map((c) => [c.code, c])),
    [currencies],
  );

  const { slices, total } = useMemo(() => {
    const rows = transactions.filter((t) => t.type === kind);
    const map = new Map<string, Slice>();
    for (const t of rows) {
      let id: string, label: string, color: string, icon: string;
      if (kind === "expense") {
        const cat = t.category_id ? catById.get(t.category_id) : undefined;
        id = t.category_id ?? "none";
        label = cat?.name ?? "Sin categoría";
        color = cat?.color ?? "cat-12";
        icon = cat?.icon ?? "ellipsis";
      } else {
        const src = t.income_source_id ? srcById.get(t.income_source_id) : undefined;
        id = t.income_source_id ?? "none";
        label = src?.name ?? "Sin fuente";
        color = src?.color ?? "cat-12";
        icon = "banknote";
      }
      const cur = map.get(id) ?? { key: id, label, color, icon, total: 0, txs: [] };
      cur.total += txInBase(t, currencies);
      cur.txs.push(t);
      map.set(id, cur);
    }
    const all = [...map.values()].sort((a, b) => b.total - a.total);
    let slices = all;
    if (all.length > 6) {
      const head = all.slice(0, 5);
      const tail = all.slice(5);
      slices = [
        ...head,
        {
          key: "otros",
          label: "Otros",
          color: "cat-12",
          icon: "ellipsis",
          total: tail.reduce((s, x) => s + x.total, 0),
          txs: tail.flatMap((x) => x.txs),
        },
      ];
    }
    return { slices, total: all.reduce((s, x) => s + x.total, 0) };
  }, [transactions, kind, catById, srcById, currencies]);

  const [open, setOpen] = useState<string | null>(null);

  if (slices.length === 0) {
    return (
      <section className="card flex flex-col p-6">
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-text-faint">
          {emptyText}
        </p>
      </section>
    );
  }

  const SIZE = 168;
  const SW = 22;
  const R = (SIZE - SW) / 2;
  const CX = SIZE / 2;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <section className="card flex flex-col p-6">
      <h2 className="mb-5 text-lg font-semibold">{title}</h2>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
        {/* Dona */}
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE}>
            <circle cx={CX} cy={CX} r={R} fill="none" stroke="#201932" strokeWidth={SW} />
            <g transform={`rotate(-90 ${CX} ${CX})`}>
              {slices.map((s) => {
                const frac = total > 0 ? s.total / total : 0;
                const len = frac * C;
                const el = (
                  <circle
                    key={s.key}
                    cx={CX}
                    cy={CX}
                    r={R}
                    fill="none"
                    stroke={colorHex(s.color)}
                    strokeWidth={SW}
                    strokeLinecap="round"
                    strokeDasharray={`${Math.max(len - 3, 0)} ${C - Math.max(len - 3, 0)}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += len;
                return el;
              })}
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] uppercase tracking-wide text-text-faint">
              {kind === "expense" ? "Gastos" : "Ingresos"}
            </span>
            <span className="px-2 text-center text-xl font-semibold tnum">
              {formatMoney(total, baseCur, { compact: true })}
            </span>
          </div>
        </div>

        {/* Lista con drill-down */}
        <div className="w-full divide-y divide-line">
          {slices.map((s) => {
            const pct = total > 0 ? (s.total / total) * 100 : 0;
            const isOpen = open === s.key;
            return (
              <div key={s.key}>
                <button
                  onClick={() => setOpen(isOpen ? null : s.key)}
                  className="flex w-full items-center gap-3 py-3 text-left transition hover:opacity-80"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: colorSoft(s.color, 22) }}
                  >
                    <Icon name={s.icon} className="h-4.5 w-4.5" strokeWidth={2.3} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between">
                      <span className="font-medium">{s.label}</span>
                      <span className="tnum font-semibold">
                        {formatMoney(s.total, baseCur)}
                      </span>
                    </span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max(pct, 3)}%`,
                            backgroundColor: colorHex(s.color),
                          }}
                        />
                      </span>
                      <span className="text-xs text-text-faint">{pct.toFixed(0)}%</span>
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-text-faint transition",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="mb-2 ml-12 space-y-2 border-l border-line pl-3">
                    {[...s.txs]
                      .sort((a, b) => b.amount - a.amount)
                      .map((t) => {
                        const acct = t.account_id ? acctById.get(t.account_id) : undefined;
                        const cur = curByCode.get(t.currency_code) ?? baseCur;
                        return (
                          <div
                            key={t.id}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="min-w-0 text-text-muted">
                              {t.note || acct?.name || (kind === "expense" ? "Gasto" : "Ingreso")}
                              <span className="text-text-faint">
                                {" · "}
                                {acct?.name ?? "—"} · {shortDate(t.occurred_on)}
                              </span>
                            </span>
                            <span className="shrink-0 tnum">
                              {formatMoney(t.amount, cur)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
