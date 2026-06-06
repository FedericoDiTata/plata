"use client";

import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "back"];

/**
 * Teclado numérico propio. Lo hacemos nosotros (en vez del teclado del SO)
 * para que los botones sean grandes, la respuesta sea instantánea y no
 * aparezca/desaparezca el teclado nativo cortando la pantalla.
 */
export function Keypad({ onKey }: { onKey: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onKey(k)}
          className="flex h-14 items-center justify-center rounded-xl bg-surface-2 text-2xl font-medium text-text transition active:scale-95 active:bg-surface-3"
        >
          {k === "back" ? <Delete className="h-6 w-6 text-text-muted" /> : k}
        </button>
      ))}
    </div>
  );
}
