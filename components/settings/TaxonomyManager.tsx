"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { colorSoft, colorVar } from "@/lib/colors";
import {
  addCategory,
  archiveCategory,
  addIncomeSource,
  archiveIncomeSource,
} from "@/app/actions/settings";
import type { Category, IncomeSource } from "@/lib/types";

type AddTarget = "expense" | "income" | "source" | null;

export function TaxonomyManager({
  expenseCategories,
  incomeCategories,
  incomeSources,
}: {
  expenseCategories: Category[];
  incomeCategories: Category[];
  incomeSources: IncomeSource[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState<AddTarget>(null);

  async function removeCat(id: string) {
    await archiveCategory(id);
    router.refresh();
  }
  async function removeSrc(id: string) {
    await archiveIncomeSource(id);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Group
        title="Categorías de gasto"
        items={expenseCategories.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          icon: c.icon,
        }))}
        onAdd={() => setAdding("expense")}
        onRemove={removeCat}
      />
      <Group
        title="Categorías de ingreso"
        items={incomeCategories.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          icon: c.icon,
        }))}
        onAdd={() => setAdding("income")}
        onRemove={removeCat}
      />
      <Group
        title="Fuentes de ingreso"
        items={incomeSources.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          icon: "banknote",
        }))}
        onAdd={() => setAdding("source")}
        onRemove={removeSrc}
      />

      <AddSheet
        target={adding}
        onClose={() => setAdding(null)}
        onSaved={() => {
          setAdding(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function Group({
  title,
  items,
  onAdd,
  onRemove,
}: {
  title: string;
  items: { id: string; name: string; color: string; icon: string }[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <span
            key={it.id}
            className="flex items-center gap-1.5 rounded-full border border-line py-1.5 pl-2 pr-1.5 text-sm"
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full"
              style={{ background: colorSoft(it.color, 22) }}
            >
              <Icon name={it.icon} className="h-3 w-3" strokeWidth={2.4} />
            </span>
            {it.name}
            <button
              onClick={() => onRemove(it.id)}
              className="ml-0.5 text-text-faint hover:text-negative"
              aria-label="Archivar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-sm text-text-muted"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar
        </button>
      </div>
    </section>
  );
}

function AddSheet({
  target,
  onClose,
  onSaved,
}: {
  target: AddTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("cat-1");
  const [busy, setBusy] = useState(false);

  if (!target) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const titles: Record<Exclude<AddTarget, null>, string> = {
    expense: "Nueva categoría de gasto",
    income: "Nueva categoría de ingreso",
    source: "Nueva fuente de ingreso",
  };

  async function save() {
    if (!name.trim() || !target) return;
    setBusy(true);
    if (target === "source") {
      await addIncomeSource({ name, color });
    } else {
      await addCategory({ name, kind: target, color, icon: "circle" });
    }
    setBusy(false);
    setName("");
    onSaved();
  }

  return (
    <Sheet open={target !== null} onClose={onClose} title={titles[target]}>
      <div className="space-y-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          autoFocus
          className="h-12 w-full rounded-xl border border-line bg-surface-2 px-4 outline-none focus:border-accent/50"
        />
        <div>
          <span className="mb-2 block text-xs text-text-muted">Color</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <button
          onClick={save}
          disabled={busy}
          className="h-12 w-full rounded-xl bg-accent font-semibold text-bg disabled:opacity-60"
          style={{ background: colorVar("accent") }}
        >
          Agregar
        </button>
      </div>
    </Sheet>
  );
}
