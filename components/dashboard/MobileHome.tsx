import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { colorSoft, colorVar } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { DateRangeFilter } from "./DateRangeFilter";
import type { AccountWithBalance, Currency } from "@/lib/types";

type Money = { symbol: string; decimals: number };
type NetWorth = { code: string; total: number; symbol: string; decimals: number };

/**
 * Cabecera del inicio — versión CELULAR.
 * Diseñada para el pulgar: patrimonio que SIEMPRE entra en pantalla (sin
 * partirse en dos líneas), filtro de período compacto, ingresos/gastos en
 * dos tarjetas y las cuentas en grilla de 2 columnas (sin scroll horizontal).
 */
export function MobileHome({
  byCurrency,
  accounts,
  curByCode,
  baseCur,
  income,
  expense,
  rangeLabel,
  from,
  to,
}: {
  byCurrency: NetWorth[];
  accounts: AccountWithBalance[];
  curByCode: Map<string, Currency>;
  baseCur: Money;
  income: number;
  expense: number;
  rangeLabel: string;
  from: string;
  to: string;
}) {
  const hasData = accounts.length > 0;

  return (
    <div className="space-y-4">
      {/* ===== Hero: patrimonio + filtro + ingresos/gastos ===== */}
      <section className="card relative overflow-hidden p-5">
        <div aria-hidden className="grad-hero pointer-events-none absolute inset-0" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-faint">
            Patrimonio neto
          </p>

          <div className="mt-2 space-y-0.5">
            {byCurrency.length === 0 ? (
              <p className="text-4xl font-semibold tracking-tight tnum">
                {formatMoney(0, baseCur)}
              </p>
            ) : (
              byCurrency.map((c, i) =>
                i === 0 ? (
                  <div key={c.code} className="flex items-baseline gap-2">
                    <span
                      className="whitespace-nowrap text-[clamp(1.9rem,9vw,2.75rem)] font-semibold leading-none tracking-tight tnum"
                      style={c.total < 0 ? { color: colorVar("negative") } : undefined}
                    >
                      {formatMoney(c.total, c)}
                    </span>
                    <span className="text-sm font-bold text-accent-2">{c.code}</span>
                  </div>
                ) : (
                  <div key={c.code} className="flex items-baseline gap-2">
                    <span
                      className="whitespace-nowrap text-xl font-semibold tracking-tight tnum text-text-muted"
                      style={c.total < 0 ? { color: colorVar("negative") } : undefined}
                    >
                      {formatMoney(c.total, c)}
                    </span>
                    <span className="text-xs font-bold text-accent-2">{c.code}</span>
                  </div>
                ),
              )
            )}
          </div>

          <div className="mt-5">
            <DateRangeFilter from={from} to={to} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <StatPill
              label="Ingresos"
              sub={rangeLabel}
              value={formatMoney(income, baseCur)}
              color="income"
              icon="in"
            />
            <StatPill
              label="Gastos"
              sub={rangeLabel}
              value={formatMoney(expense, baseCur)}
              color="negative"
              icon="out"
            />
          </div>
        </div>
      </section>

      {/* ===== Cuentas ===== */}
      {hasData && (
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-text-muted">Tus cuentas</p>
            <Link href="/cuentas" className="text-xs font-medium text-accent">
              Gestionar
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {accounts.map((a) => {
              const cur = curByCode.get(a.currency_code) ?? baseCur;
              return (
                <Link
                  key={a.id}
                  href="/cuentas"
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 transition active:scale-[0.98]"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{ background: colorSoft(a.color, 22) }}
                  >
                    <Icon name={a.icon} className="h-5 w-5" strokeWidth={2.1} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] text-text-faint">
                      {a.name} · {a.currency_code}
                    </p>
                    <p
                      className="truncate text-base font-semibold tnum"
                      style={a.balance < 0 ? { color: colorVar("negative") } : undefined}
                    >
                      {formatMoney(a.balance, cur)}
                    </p>
                  </div>
                </Link>
              );
            })}
            <Link
              href="/cuentas"
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line-strong px-3 py-3 text-sm font-medium text-text-muted transition active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Cuenta
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  sub,
  value,
  color,
  icon,
}: {
  label: string;
  sub: string;
  value: string;
  color: string;
  icon: "in" | "out";
}) {
  const Arrow = icon === "in" ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-3">
      <div className="flex items-center gap-1.5">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{ background: colorSoft(color, 20) }}
        >
          <Arrow className="h-3.5 w-3.5" style={{ color: colorVar(color) }} strokeWidth={2.5} />
        </span>
        <span className="text-sm font-medium text-text-muted">{label}</span>
      </div>
      <p
        className="mt-2 whitespace-nowrap text-[clamp(1.1rem,5.5vw,1.6rem)] font-semibold leading-none tracking-tight tnum"
        style={{ color: colorVar(color) }}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[10px] text-text-faint">{sub}</p>
    </div>
  );
}
