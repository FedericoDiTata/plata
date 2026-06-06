"use client";

import { Check } from "lucide-react";
import { colorVar } from "@/lib/colors";
import { cn } from "@/lib/utils";

const TOKENS = Array.from({ length: 12 }, (_, i) => `cat-${i + 1}`);

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (token: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TOKENS.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90",
            value === t && "ring-2 ring-offset-2 ring-offset-surface",
          )}
          style={{
            background: colorVar(t),
            ...(value === t ? { boxShadow: `0 0 0 2px ${colorVar(t)}` } : {}),
          }}
        >
          {value === t && <Check className="h-4 w-4 text-bg" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
