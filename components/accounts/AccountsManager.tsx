"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Archive } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { IconPicker } from "@/components/ui/IconPicker";
import { formatMoney } from "@/lib/format";
import { colorSoft } from "@/lib/colors";
import { cn } from "@/lib/utils";
import {
  createAccount,
  updateAccount,
  setAccountArchived,
} from "@/app/actions/accounts";
import type {
  AccountType,
  AccountWithBalance,
  Currency,
} from "@/lib/types";

const TYPES: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "bank", label: "Banco" },
  { value: "wallet", label: "Billetera" },
  { value: "crypto", label: "Cripto" },
  { value: "investment", label: "Inversión" },
  { value: "other", label: "Otra" },
];

export function AccountsManager({
  accounts,
  currencies,
}: {
  accounts: AccountWithBalance[];
  currencies: Currency[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AccountWithBalance | null>(null);
  const curOf = (code: string) =>
    currencies.find((c) => c.code === code) ?? { symbol: code, decimals: 2 };

  return (
    <>
      <div className="space-y-3">
        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => setEditing(a)}
            className="card flex w-full items-center gap-3 p-4 text-left transition active:bg-surface-2"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: colorSoft(a.color, 20) }}
            >
              <Icon name={a.icon} className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{a.name}</span>
              <span className="block text-xs text-text-faint">
                {a.currency_code}
              </span>
            </span>
            <span className="text-right text-lg font-semibold tnum">
              {formatMoney(a.balance, curOf(a.currency_code))}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setCreateOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-3 text-sm font-medium text-text-muted transition active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" /> Nueva cuenta
      </button>

      <AccountSheet
        key={editing?.id ?? "new"}
        open={createOpen || editing !== null}
        account={editing}
        currencies={currencies}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          setCreateOpen(false);
          setEditing(null);
          router.refresh();
        }}
      />
    </>
  );
}

function AccountSheet({
  open,
  account,
  currencies,
  onClose,
  onSaved,
}: {
  open: boolean;
  account: AccountWithBalance | null;
  currencies: Currency[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = account !== null;
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("cash");
  const [currency, setCurrency] = useState(currencies[0]?.code ?? "ARS");
  const [initial, setInitial] = useState("0");
  const [color, setColor] = useState("cat-1");
  const [icon, setIcon] = useState("wallet");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setCurrency(account.currency_code);
      setInitial(String(account.initial_balance));
      setColor(account.color);
      setIcon(account.icon);
    } else {
      setName("");
      setType("cash");
      setCurrency(currencies[0]?.code ?? "ARS");
      setInitial("0");
      setColor("cat-1");
      setIcon("wallet");
    }
  }, [account, currencies]);

  async function save() {
    setError(null);
    if (!name.trim()) return setError("Poné un nombre.");
    setBusy(true);
    const payload = {
      name,
      currency_code: currency,
      type,
      initial_balance: Number(initial.replace(",", ".")) || 0,
      color,
      icon,
    };
    const res = isEdit
      ? await updateAccount(account!.id, payload)
      : await createAccount(payload);
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Error");
    onSaved();
  }

  async function archive() {
    if (!account) return;
    setBusy(true);
    await setAccountArchived(account.id, true);
    setBusy(false);
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? "Editar cuenta" : "Nueva cuenta"}>
      <div className="space-y-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (ej: Efectivo, Banco, USD)"
          className="h-12 w-full rounded-xl border border-line bg-surface-2 px-4 outline-none focus:border-accent/50"
        />

        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
            className="h-12 flex-1 rounded-xl border border-line bg-surface-2 px-3 outline-none"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-12 rounded-xl border border-line bg-surface-2 px-3 outline-none"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs text-text-muted">
            Saldo inicial
          </span>
          <input
            value={initial}
            onChange={(e) => setInitial(e.target.value)}
            inputMode="decimal"
            className="h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-lg tnum outline-none focus:border-accent/50"
          />
        </label>

        <div>
          <span className="mb-2 block text-xs text-text-muted">Ícono</span>
          <IconPicker value={icon} color={color} onChange={setIcon} />
        </div>
        <div>
          <span className="mb-2 block text-xs text-text-muted">Color</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}

        <div className="flex gap-2">
          {isEdit && (
            <button
              onClick={archive}
              disabled={busy}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-medium text-text-muted disabled:opacity-60",
              )}
            >
              <Archive className="h-4 w-4" /> Archivar
            </button>
          )}
          <button
            onClick={save}
            disabled={busy}
            className="h-12 flex-1 rounded-xl bg-accent font-semibold text-bg disabled:opacity-60"
          >
            {isEdit ? "Guardar" : "Crear cuenta"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
