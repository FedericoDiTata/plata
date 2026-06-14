import Link from "next/link";
import { endOfMonth, startOfMonth, format } from "date-fns";
import { Plus } from "lucide-react";
import { getProfile } from "@/lib/dal";
import {
  getAccountsWithBalances,
  getCategories,
  getCurrencies,
  getDebts,
  getGoalContributions,
  getGoals,
  getIncomeSources,
  getRecurringRules,
  getTransactions,
} from "@/lib/data";
import { balancesByCurrency, monthTotals } from "@/lib/calc";
import { formatMoney, shortDate } from "@/lib/format";
import { colorSoft, colorVar } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { BreakdownCard } from "@/components/dashboard/BreakdownCard";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { MobileHome } from "@/components/dashboard/MobileHome";
import { DashboardGoals } from "@/components/dashboard/DashboardGoals";
import { DashboardDebts } from "@/components/dashboard/DashboardDebts";
import { DashboardRecurring } from "@/components/dashboard/DashboardRecurring";
import type { Currency } from "@/lib/types";

const HISTORIC_FROM = "2000-01-01";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const monthFrom = format(startOfMonth(now), "yyyy-MM-dd");
  const monthTo = format(endOfMonth(now), "yyyy-MM-dd");

  const from = sp.from ?? monthFrom;
  const to = sp.to ?? monthTo;
  const rangeLabel =
    from === HISTORIC_FROM
      ? "Histórico"
      : from === monthFrom && to === monthTo
        ? "Este mes"
        : `${shortDate(from)} – ${shortDate(to)}`;

  const [
    profile,
    currencies,
    accounts,
    categories,
    incomeSources,
    rangeTxs,
    monthTxs,
    goals,
    debts,
    contributions,
    recurringRules,
  ] = await Promise.all([
    getProfile(),
    getCurrencies(),
    getAccountsWithBalances(),
    getCategories(),
    getIncomeSources(),
    getTransactions({ from, to, limit: 5000 }),
    getTransactions({ from: monthFrom, to: monthTo, limit: 2000 }),
    getGoals(),
    getDebts(),
    getGoalContributions(),
    getRecurringRules(),
  ]);

  const base = profile?.base_currency ?? "USD";
  const baseCur: Pick<Currency, "symbol" | "decimals"> =
    currencies.find((c) => c.code === base) ?? { symbol: base, decimals: 2 };
  const curByCode = new Map(currencies.map((c) => [c.code, c]));

  const byCurrency = balancesByCurrency(accounts, currencies);
  const { income, expense } = monthTotals(rangeTxs, currencies);
  const paidIds = [
    ...new Set(
      monthTxs.filter((t) => t.recurring_id).map((t) => t.recurring_id as string),
    ),
  ];
  const hasData = accounts.length > 0;

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* ===== Hero (CELULAR) ===== */}
      <div className="lg:hidden">
        <MobileHome
          byCurrency={byCurrency}
          accounts={accounts}
          curByCode={curByCode}
          baseCur={baseCur}
          income={income}
          expense={expense}
          rangeLabel={rangeLabel}
          from={from}
          to={to}
        />
      </div>

      {/* ===== Hero (COMPU) ===== */}
      <section className="card relative hidden overflow-hidden p-6 lg:block lg:p-8">
        <div aria-hidden className="grad-hero pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-8">
          {/* Izquierda: patrimonio (título centrado, números a la izquierda) */}
          <div className="flex flex-1 flex-col items-center justify-center lg:items-stretch">
            <p className="text-center text-base font-semibold uppercase tracking-wide text-text-muted">
              Patrimonio neto
            </p>
            <div className="mt-4 flex flex-col items-center gap-3 lg:items-start">
              {byCurrency.length === 0 ? (
                <p className="text-5xl font-semibold tnum lg:text-6xl">
                  {formatMoney(0, baseCur)}
                </p>
              ) : (
                byCurrency.map((c) => (
                  <div key={c.code} className="flex items-baseline gap-3">
                    <span
                      className="text-5xl font-semibold tracking-tight tnum lg:text-6xl"
                      style={c.total < 0 ? { color: colorVar("negative") } : undefined}
                    >
                      {formatMoney(c.total, c)}
                    </span>
                    <span className="text-2xl font-semibold text-accent-2">
                      {c.code}
                    </span>
                  </div>
                ))
              )}
            </div>

            {hasData && (
              <div className="mt-7 flex flex-wrap justify-center gap-2.5 lg:justify-start">
                {accounts.map((a) => {
                  const cur = curByCode.get(a.currency_code) ?? baseCur;
                  return (
                    <Link key={a.id} href="/cuentas" className="group">
                      <Tile
                        icon={a.icon}
                        iconColor={a.color}
                        label={`${a.name} · ${a.currency_code}`}
                        value={formatMoney(a.balance, cur)}
                        valueColor={a.balance < 0 ? "negative" : undefined}
                      />
                    </Link>
                  );
                })}
                <Link
                  href="/cuentas"
                  className="flex items-center gap-1.5 rounded-2xl border border-dashed border-line-strong px-4 text-sm font-medium text-text-muted transition hover:text-text"
                >
                  <Plus className="h-4 w-4" /> Cuenta
                </Link>
              </div>
            )}
          </div>

          {/* Derecha: filtro (ancho completo) + tiles grandes de ingresos/gastos */}
          <div className="flex w-full flex-col gap-3 lg:w-[42%]">
            <DateRangeFilter from={from} to={to} />
            <div className="grid flex-1 grid-cols-2 gap-3">
              <BigTile
                label="Ingresos"
                sub={rangeLabel}
                value={formatMoney(income, baseCur)}
                color="income"
              />
              <BigTile
                label="Gastos"
                sub={rangeLabel}
                value={formatMoney(expense, baseCur)}
                color="negative"
              />
            </div>
          </div>
        </div>
      </section>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Fila 1: en qué se va / cómo entra */}
          <div className="grid gap-5 lg:grid-cols-2">
            <BreakdownCard
              title="En qué se va la plata"
              emptyText="Todavía no hay gastos en este período."
              kind="expense"
              transactions={rangeTxs}
              categories={categories}
              incomeSources={incomeSources}
              accounts={accounts}
              currencies={currencies}
              base={base}
            />
            <BreakdownCard
              title="Cómo entra la plata"
              emptyText="Todavía no hay ingresos en este período."
              kind="income"
              transactions={rangeTxs}
              categories={categories}
              incomeSources={incomeSources}
              accounts={accounts}
              currencies={currencies}
              base={base}
            />
          </div>

          {/* Fila 2: gastos fijos / deudas / ahorros */}
          <div className="grid gap-5 lg:grid-cols-3">
            <DashboardRecurring
              rules={recurringRules}
              accounts={accounts}
              categories={categories}
              incomeSources={incomeSources}
              paidIds={paidIds}
              currencies={currencies}
            />
            <DashboardDebts
              debts={debts}
              accounts={accounts}
              currencies={currencies}
              base={base}
            />
            <DashboardGoals
              goals={goals}
              contributions={contributions}
              accounts={accounts}
              currencies={currencies}
              base={base}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  color,
  valueColor,
  icon,
  iconColor,
}: {
  label: string;
  value: string;
  color?: string;
  valueColor?: string;
  icon?: string;
  iconColor?: string;
}) {
  return (
    <div className="flex min-w-[150px] items-center gap-3 rounded-2xl border border-line bg-bg/40 px-4 py-3 transition group-hover:border-line-strong">
      {icon && (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: colorSoft(iconColor ?? "cat-12", 24) }}
        >
          <Icon name={icon} className="h-4.5 w-4.5" strokeWidth={2.2} />
        </span>
      )}
      <div>
        <p className="text-[11px] text-text-faint">{label}</p>
        <p
          className="text-xl font-semibold tnum"
          style={{ color: colorVar(valueColor ?? color ?? "text") }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function BigTile({
  label,
  sub,
  value,
  color,
}: {
  label: string;
  sub: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-line bg-bg/40 p-4 text-center">
      <p className="text-xl font-semibold">{label}</p>
      <p className="text-xs text-text-faint">{sub}</p>
      <p
        className="mt-2 w-full whitespace-nowrap text-[clamp(1.1rem,1.9vw,2rem)] font-semibold leading-tight tracking-tight tnum"
        style={{ color: colorVar(color) }}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-3xl">
        💸
      </div>
      <div>
        <p className="font-semibold">Empezá a cargar tu plata</p>
        <p className="mt-1 text-sm text-text-muted">
          Tocá el botón <Plus className="inline h-4 w-4" /> para registrar tu
          primer movimiento.
        </p>
      </div>
    </div>
  );
}
