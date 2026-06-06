"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import { cn } from "@/lib/utils";

const HISTORIC_FROM = "2000-01-01";

/**
 * Filtro de período por calendario: presets rápidos + rango "desde / hasta".
 * Cambia ?from= y ?to= en la URL → el dashboard re-renderiza con ese rango.
 */
export function DateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const now = new Date();

  function apply(f: string, t: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("from", f);
    sp.set("to", t);
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  const monthFrom = format(startOfMonth(now), "yyyy-MM-dd");
  const monthTo = format(endOfMonth(now), "yyyy-MM-dd");
  const last = subMonths(now, 1);
  const lastFrom = format(startOfMonth(last), "yyyy-MM-dd");
  const lastTo = format(endOfMonth(last), "yyyy-MM-dd");
  const today = format(now, "yyyy-MM-dd");

  const isThisMonth = from === monthFrom && to === monthTo;
  const isLastMonth = from === lastFrom && to === lastTo;
  const isHistoric = from === HISTORIC_FROM;

  const presets = [
    { label: "Este mes", active: isThisMonth, onClick: () => apply(monthFrom, monthTo) },
    { label: "Mes pasado", active: isLastMonth, onClick: () => apply(lastFrom, lastTo) },
    { label: "Histórico", active: isHistoric, onClick: () => apply(HISTORIC_FROM, today) },
  ];

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-1.5">
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-bg/40 p-1 sm:flex">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={p.onClick}
            className={cn(
              "h-8 rounded-lg px-2.5 text-xs font-medium transition",
              p.active ? "grad-violet text-bg" : "text-text-muted hover:text-text",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1 rounded-xl border border-line bg-bg/40 px-2 py-1.5 text-xs text-text-muted sm:py-1">
        <input
          type="date"
          value={isHistoric ? "" : from}
          max={to}
          onChange={(e) => e.target.value && apply(e.target.value, to)}
          className="bg-transparent text-text outline-none [color-scheme:dark]"
        />
        <span className="text-text-faint">→</span>
        <input
          type="date"
          value={isHistoric ? "" : to}
          min={from}
          onChange={(e) => e.target.value && apply(from === HISTORIC_FROM ? monthFrom : from, e.target.value)}
          className="bg-transparent text-text outline-none [color-scheme:dark]"
        />
      </div>
    </div>
  );
}
