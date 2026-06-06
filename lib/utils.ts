// Mini helper para combinar clases condicionalmente (como clsx, sin dependencia).
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
