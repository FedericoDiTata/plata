import { format, isToday, isYesterday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Currency } from "./types";

// Forma mínima que necesitamos para formatear: símbolo y decimales.
type MoneyShape = Pick<Currency, "symbol" | "decimals">;

/**
 * Formatea un monto con formato argentino (1.234,56) y el símbolo de la moneda.
 * Ej: formatMoney(1234.5, { symbol: 'US$', decimals: 2 }) -> "US$ 1.234,50"
 */
export function formatMoney(
  amount: number,
  currency: MoneyShape,
  opts: { signed?: boolean; compact?: boolean } = {},
): string {
  const decimals = currency.decimals ?? 2;
  const abs = Math.abs(amount);

  const num = opts.compact
    ? compactNumber(abs)
    : new Intl.NumberFormat("es-AR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(abs);

  const sign = opts.signed && amount !== 0 ? (amount > 0 ? "+" : "−") : amount < 0 ? "−" : "";
  return `${sign}${currency.symbol} ${num}`;
}

/** Versión corta para números grandes: 1,2 M / 345 k */
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (n >= 10_000) return `${Math.round(n / 1000)} k`;
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

/** Formatea solo el número (sin símbolo), con decimales de la moneda. */
export function formatNumber(amount: number, decimals = 2): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/** Convierte un monto a la moneda base usando la tasa (valor de 1 unidad en base). */
export function toBase(amount: number, rate: number): number {
  return amount * rate;
}

/** Convierte de una moneda a otra usando las tasas de ambas. */
export function convert(amount: number, fromRate: number, toRate: number): number {
  if (!toRate) return 0;
  return (amount * fromRate) / toRate;
}

// ----------------------- Fechas -----------------------

/** Encabezado amigable para agrupar movimientos por día. */
export function dayHeader(dateISO: string): string {
  const d = parseISO(dateISO);
  if (isToday(d)) return "Hoy";
  if (isYesterday(d)) return "Ayer";
  return capitalize(format(d, "EEEE d 'de' MMMM", { locale: es }));
}

/** Fecha corta: "3 jun 2026" */
export function shortDate(dateISO: string): string {
  return format(parseISO(dateISO), "d MMM yyyy", { locale: es });
}

/** Mes y año: "Junio 2026" */
export function monthLabel(date: Date): string {
  return capitalize(format(date, "MMMM yyyy", { locale: es }));
}

/** Primer día del mes en formato 'YYYY-MM-01' (para presupuestos). */
export function monthKey(date: Date): string {
  return format(date, "yyyy-MM-01");
}

/** Fecha de hoy en 'YYYY-MM-DD' (zona local). */
export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
