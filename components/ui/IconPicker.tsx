"use client";

import { Icon } from "./Icon";
import { colorSoft, colorVar } from "@/lib/colors";
import { cn } from "@/lib/utils";

const ICONS = [
  "wallet",
  "landmark",
  "credit-card",
  "bitcoin",
  "piggy-bank",
  "coins",
  "banknote",
  "shopping-cart",
  "utensils",
  "bus",
  "house",
  "heart-pulse",
  "graduation-cap",
  "gift",
  "shirt",
  "plug",
  "laptop",
  "beer",
];

export function IconPicker({
  value,
  color,
  onChange,
}: {
  value: string;
  color: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ICONS.map((ic) => {
        const active = value === ic;
        return (
          <button
            key={ic}
            type="button"
            onClick={() => onChange(ic)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border transition active:scale-90",
              active ? "border-transparent" : "border-line",
            )}
            style={active ? { background: colorSoft(color, 22) } : undefined}
          >
            <Icon
              name={ic}
              className="h-5 w-5"
              strokeWidth={2.2}
            />
            {active && (
              <span
                className="sr-only"
                style={{ color: colorVar(color) }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
