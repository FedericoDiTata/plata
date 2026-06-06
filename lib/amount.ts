// Lógica del monto que se arma con el teclado.
// Guardamos el valor como string SIN separadores de miles y con ","
// como separador decimal (formato argentino). Ej: "1234,5".

const MAX_INT_DIGITS = 12;

/** Aplica una tecla al valor actual y devuelve el nuevo valor. */
export function applyKey(value: string, key: string, maxDecimals = 2): string {
  if (key === "back") {
    const next = value.slice(0, -1);
    return next === "" ? "0" : next;
  }

  if (key === ",") {
    if (maxDecimals === 0) return value;
    if (value.includes(",")) return value;
    return value === "" ? "0," : value + ",";
  }

  // Dígito 0-9
  const [intPart, decPart] = value.split(",");
  if (value.includes(",")) {
    if ((decPart?.length ?? 0) >= maxDecimals) return value; // ya completó decimales
    return value + key;
  }
  if (value === "0") return key === "0" ? "0" : key; // evita "007"
  if (intPart.length >= MAX_INT_DIGITS) return value;
  return value + key;
}

/** Formatea el valor en proceso para mostrarlo (agrupa miles con "."). */
export function formatAmountDisplay(value: string): string {
  const [intPart, decPart] = value.split(",");
  const grouped = new Intl.NumberFormat("es-AR").format(Number(intPart || "0"));
  if (value.includes(",")) return `${grouped},${decPart ?? ""}`;
  return grouped;
}

/** Convierte el valor a número real para guardar. */
export function parseAmount(value: string): number {
  const num = Number(value.replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}
