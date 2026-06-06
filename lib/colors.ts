// Las categorías/cuentas guardan un token de color (ej "cat-7").
// Como Tailwind no puede generar clases con nombres dinámicos, usamos
// variables CSS en estilos inline.

/** Color pleno: var(--color-cat-7) */
export function colorVar(token: string): string {
  return `var(--color-${token})`;
}

/**
 * Versión tenue del color para fondos (mezcla con transparente).
 * color-mix tiene soporte en todos los navegadores modernos.
 */
export function colorSoft(token: string, pct = 14): string {
  return `color-mix(in srgb, var(--color-${token}) ${pct}%, transparent)`;
}

/**
 * Color HEX literal por token. Necesario para SVG (los gráficos): algunos
 * navegadores NO resuelven var(--color-x) dentro de un SVG, así que ahí
 * usamos el hex directo. Debe coincidir con los valores de globals.css.
 */
const HEX: Record<string, string> = {
  "cat-1": "#a78bfa",
  "cat-2": "#818cf8",
  "cat-3": "#fbbf24",
  "cat-4": "#fb7185",
  "cat-5": "#c084fc",
  "cat-6": "#34d399",
  "cat-7": "#f472b6",
  "cat-8": "#e879f9",
  "cat-9": "#a3e635",
  "cat-10": "#60a5fa",
  "cat-11": "#f59e0b",
  "cat-12": "#9aa0c2",
  accent: "#8b5cf6",
  "accent-2": "#c084fc",
  "accent-3": "#818cf8",
  income: "#34d399",
  negative: "#fb7185",
  info: "#818cf8",
  warn: "#fbbf24",
};

export function colorHex(token: string): string {
  return HEX[token] ?? "#9aa0c2";
}
