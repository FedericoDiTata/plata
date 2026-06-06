import type { AccountWithBalance, Currency, Transaction } from "./types";

/** Cotización actual de una moneda (valor de 1 unidad en moneda base). */
export function currencyRate(code: string, currencies: Currency[]): number {
  return currencies.find((c) => c.code === code)?.rate ?? 1;
}

/** Patrimonio neto = suma de saldos de todas las cuentas, en moneda base. */
export function netWorthInBase(
  accounts: AccountWithBalance[],
  currencies: Currency[],
): number {
  return accounts.reduce(
    (sum, a) => sum + a.balance * currencyRate(a.currency_code, currencies),
    0,
  );
}

/**
 * Monto de un movimiento convertido a la moneda base, usando la cotización
 * ACTUAL de su moneda. Es robusto ante cambios de moneda base (a diferencia
 * de la cotización congelada, que quedaría relativa a la base vieja).
 */
export function txInBase(t: Transaction, currencies: Currency[]): number {
  return t.amount * currencyRate(t.currency_code, currencies);
}

export interface CurrencyBalance {
  code: string;
  symbol: string;
  decimals: number;
  total: number;
}

/** Patrimonio separado por moneda (sin convertir): ARS por un lado, USD por otro. */
export function balancesByCurrency(
  accounts: AccountWithBalance[],
  currencies: Currency[],
): CurrencyBalance[] {
  const map = new Map<string, number>();
  for (const a of accounts) {
    map.set(a.currency_code, (map.get(a.currency_code) ?? 0) + a.balance);
  }
  return [...map.entries()]
    .map(([code, total]) => {
      const cur = currencies.find((c) => c.code === code);
      return {
        code,
        total,
        symbol: cur?.symbol ?? code,
        decimals: cur?.decimals ?? 2,
      };
    })
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

export interface MonthTotals {
  income: number;
  expense: number;
}

/** Totales de ingresos y gastos (en base) de una lista de movimientos. */
export function monthTotals(
  txs: Transaction[],
  currencies: Currency[],
): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === "income") income += txInBase(t, currencies);
    else if (t.type === "expense") expense += txInBase(t, currencies);
  }
  return { income, expense };
}

export interface CategorySlice {
  categoryId: string | null;
  total: number;
}

/** Gasto por categoría (en base), ordenado de mayor a menor. */
export function expenseByCategory(
  txs: Transaction[],
  currencies: Currency[],
): CategorySlice[] {
  const map = new Map<string | null, number>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    const key = t.category_id;
    map.set(key, (map.get(key) ?? 0) + txInBase(t, currencies));
  }
  return [...map.entries()]
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total);
}

/** Ingreso por fuente (en base), ordenado de mayor a menor. */
export function incomeBySource(
  txs: Transaction[],
  currencies: Currency[],
): {
  sourceId: string | null;
  total: number;
}[] {
  const map = new Map<string | null, number>();
  for (const t of txs) {
    if (t.type !== "income") continue;
    map.set(
      t.income_source_id,
      (map.get(t.income_source_id) ?? 0) + txInBase(t, currencies),
    );
  }
  return [...map.entries()]
    .map(([sourceId, total]) => ({ sourceId, total }))
    .sort((a, b) => b.total - a.total);
}
