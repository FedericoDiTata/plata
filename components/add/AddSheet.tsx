"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, subDays } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Calendar, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Keypad } from "./Keypad";
import { Icon } from "@/components/ui/Icon";
import { createTransaction } from "@/app/actions/transactions";
import { applyKey, formatAmountDisplay, parseAmount } from "@/lib/amount";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { todayISO } from "@/lib/format";
import { colorSoft, colorVar } from "@/lib/colors";
import { cn } from "@/lib/utils";
import type {
  AccountWithBalance,
  Category,
  Currency,
  IncomeSource,
  TxType,
} from "@/lib/types";

const LAST_ACCOUNT_KEY = "plata:lastAccount";

// Id especial para la fuente "Otro" (un ingreso suelto, sin fuente fija).
const CUSTOM_SOURCE = "__custom__";

const TYPES = [
  ["expense", "Gasto"],
  ["income", "Ingreso"],
  ["transfer", "Transf."],
] as const;

export function AddSheet({
  open,
  onClose,
  accounts,
  expenseCategories,
  incomeCategories,
  incomeSources,
  currencies,
}: {
  open: boolean;
  onClose: () => void;
  accounts: AccountWithBalance[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  incomeSources: IncomeSource[];
  currencies: Currency[];
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [type, setType] = useState<TxType>("expense");
  const [amountStr, setAmountStr] = useState("0");
  const [accountId, setAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [incomeSourceId, setIncomeSourceId] = useState<string | null>(null);
  const [customSource, setCustomSource] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // En celular el panel ocupa toda la pantalla: bloqueo el scroll del fondo
  // mientras está abierto (en compu de eso se encarga el componente Sheet).
  useEffect(() => {
    if (!open || isDesktop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isDesktop]);

  // Al abrir: reseteo y cuenta por defecto (la última usada o la primera).
  useEffect(() => {
    if (!open) return;
    setAmountStr("0");
    setNote("");
    setDate(todayISO());
    setError(null);
    setCategoryId(null);
    setIncomeSourceId(incomeSources[0]?.id ?? CUSTOM_SOURCE);
    setCustomSource("");
    const last =
      typeof window !== "undefined"
        ? localStorage.getItem(LAST_ACCOUNT_KEY)
        : null;
    const valid = accounts.find((a) => a.id === last);
    setAccountId(valid?.id ?? accounts[0]?.id ?? "");
    setToAccountId(accounts[1]?.id ?? accounts[0]?.id ?? "");
  }, [open, accounts, incomeSources]);

  const account = accounts.find((a) => a.id === accountId);
  const currency = useMemo(
    () => currencies.find((c) => c.code === account?.currency_code),
    [currencies, account],
  );
  const decimals = currency?.decimals ?? 2;
  const amount = parseAmount(amountStr);

  // Fuentes de ingreso + opción "Otro" (para ingresos sueltos/random).
  const incomeItems = useMemo(
    () => [
      ...incomeSources.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        icon: "banknote",
      })),
      { id: CUSTOM_SOURCE, name: "Otro", color: "cat-12", icon: "tag" },
    ],
    [incomeSources],
  );
  const isCustomSource = type === "income" && incomeSourceId === CUSTOM_SOURCE;

  const accent =
    type === "income" ? "income" : type === "transfer" ? "info" : "text";
  const saveColor =
    type === "income" ? "income" : type === "transfer" ? "info" : "negative";

  function pressKey(key: string) {
    setAmountStr((v) => applyKey(v, key, decimals));
  }

  // Entrada de monto por teclado normal (desktop)
  function onAmountInput(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/[^\d,]/g, "");
    const parts = v.split(",");
    if (parts.length > 2) v = parts[0] + "," + parts.slice(1).join("");
    const [intp, dec] = v.split(",");
    if (dec !== undefined) v = intp + "," + dec.slice(0, decimals);
    setAmountStr(v === "" ? "0" : v);
  }

  function changeType(t: TxType) {
    setType(t);
    setCategoryId(null);
  }

  async function handleSave() {
    setError(null);
    if (amount <= 0) return setError("Ingresá un monto.");
    if (!accountId) return setError("Elegí una cuenta.");
    if (type === "expense" && !categoryId) return setError("Elegí una categoría.");
    if (type === "income" && !incomeSourceId)
      return setError("Elegí la fuente del ingreso.");
    const isCustomIncome = type === "income" && incomeSourceId === CUSTOM_SOURCE;
    if (isCustomIncome && !customSource.trim())
      return setError("Escribí de dónde vino el ingreso.");
    if (type === "transfer" && accountId === toAccountId)
      return setError("Las cuentas de origen y destino deben ser distintas.");

    // Para un ingreso suelto ("Otro") guardamos el texto libre como nota: es
    // lo que después aparece como su etiqueta en "Cómo entra la plata".
    const finalNote = isCustomIncome
      ? [customSource.trim(), note.trim()].filter(Boolean).join(" · ")
      : note.trim() || null;

    setSaving(true);
    const res = await createTransaction({
      type,
      amount,
      currency_code: account!.currency_code,
      account_id: accountId,
      to_account_id: type === "transfer" ? toAccountId : null,
      category_id: type !== "transfer" ? categoryId : null,
      income_source_id:
        type === "income" && incomeSourceId !== CUSTOM_SOURCE
          ? incomeSourceId
          : null,
      note: finalNote,
      occurred_on: date,
    });
    setSaving(false);

    if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
    if (typeof window !== "undefined")
      localStorage.setItem(LAST_ACCOUNT_KEY, accountId);
    onClose();
    router.refresh();
  }

  /* ============================================================
     CELULAR — pantalla de carga a pantalla completa.
     Estructura fija: monto arriba + teclado/Guardar abajo, y el
     medio (categorías/fuente) scrollea solo si hace falta.
     ============================================================ */
  if (!isDesktop) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[96dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] border border-line bg-surface"
            >
              {/* Encabezado: tipo + cerrar */}
              <div className="shrink-0 px-4 pt-3">
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong" />
                <div className="flex items-center gap-2">
                  <div className="grid flex-1 grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
                    {TYPES.map(([t, label]) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => changeType(t)}
                        className={cn(
                          "h-9 rounded-xl text-sm font-medium transition",
                          type === t
                            ? "bg-surface-3 text-text shadow-sm"
                            : "text-text-muted",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-muted transition active:scale-90"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Monto (fijo) */}
              <div className="shrink-0 px-4 pb-2 pt-4 text-center">
                <div
                  className="flex items-baseline justify-center gap-1.5 tnum"
                  style={{
                    color: accent === "text" ? undefined : colorVar(accent),
                  }}
                >
                  <span className="text-2xl font-medium text-text-faint">
                    {currency?.symbol ?? "$"}
                  </span>
                  <span className="text-[clamp(2rem,11vw,2.75rem)] font-semibold leading-none tracking-tight">
                    {formatAmountDisplay(amountStr)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-text-faint">
                  {account?.currency_code} · {account?.name}
                </p>
              </div>

              {/* Medio (scrollea solo si hace falta) */}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-1">
                {type === "transfer" ? (
                  <div className="space-y-2">
                    <MobileAccountGrid
                      label="Desde"
                      accounts={accounts}
                      selected={accountId}
                      onSelect={setAccountId}
                    />
                    <div className="flex justify-center py-0.5 text-text-faint">
                      <ArrowRight className="h-4 w-4 rotate-90" />
                    </div>
                    <MobileAccountGrid
                      label="Hacia"
                      accounts={accounts}
                      selected={toAccountId}
                      onSelect={setToAccountId}
                    />
                    <p className="pt-1 text-center text-xs text-text-faint">
                      Movés plata entre tus cuentas. No cuenta como gasto ni
                      ingreso.
                    </p>
                  </div>
                ) : type === "expense" ? (
                  <IconGrid
                    items={expenseCategories.map((c) => ({
                      id: c.id,
                      name: c.name,
                      color: c.color,
                      icon: c.icon,
                    }))}
                    selected={categoryId}
                    onSelect={setCategoryId}
                  />
                ) : (
                  <>
                    <IconGrid
                      items={incomeItems}
                      selected={incomeSourceId}
                      onSelect={setIncomeSourceId}
                    />
                    {isCustomSource && (
                      <input
                        value={customSource}
                        onChange={(e) => setCustomSource(e.target.value)}
                        placeholder="¿De dónde vino? (ej: cena con amigos)"
                        maxLength={80}
                        autoFocus
                        className="mt-3 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm outline-none placeholder:text-text-faint focus:border-accent/50"
                      />
                    )}
                  </>
                )}

                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nota (opcional)"
                  maxLength={200}
                  className="mt-3 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm outline-none placeholder:text-text-faint focus:border-accent/50"
                />
              </div>

              {/* Pie fijo: cuenta + fecha + teclado + Guardar */}
              <div
                className="shrink-0 border-t border-line bg-surface px-4 pt-3"
                style={{ paddingBottom: "max(env(safe-area-inset-bottom),12px)" }}
              >
                <div className="mb-3 flex items-center gap-2">
                  {type !== "transfer" && (
                    <div className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
                      {accounts.map((a) => {
                        const active = accountId === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setAccountId(a.id)}
                            className={cn(
                              "flex min-w-0 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs transition active:scale-95",
                              active
                                ? "border-transparent text-text"
                                : "border-line text-text-muted",
                            )}
                            style={
                              active
                                ? {
                                    background: colorSoft(a.color, 20),
                                    borderColor: colorVar(a.color),
                                  }
                                : undefined
                            }
                          >
                            <Icon name={a.icon} className="h-4 w-4 shrink-0" />
                            <span className="truncate">{a.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className={cn(type === "transfer" && "flex-1")} />
                  <DatePicker date={date} onChange={setDate} />
                </div>

                {error && (
                  <p className="mb-3 rounded-lg bg-negative-soft px-3 py-2 text-center text-sm text-negative">
                    {error}
                  </p>
                )}

                <Keypad onKey={pressKey} />

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="mt-3 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-semibold text-bg transition active:scale-[0.98] disabled:opacity-60"
                  style={{ background: colorVar(saveColor) }}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  /* ============================================================
     COMPU — ventana centrada con formulario normal (sin teclado).
     ============================================================ */
  return (
    <Sheet open={open} onClose={onClose}>
      {/* Selector de tipo */}
      <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {TYPES.map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => changeType(t)}
            className={cn(
              "h-9 rounded-lg text-sm font-medium transition",
              type === t ? "bg-surface-3 text-text shadow-sm" : "text-text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Monto */}
      <div className="mb-5">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-3 focus-within:border-accent/60">
          <span className="text-2xl text-text-faint">
            {currency?.symbol ?? "$"}
          </span>
          <input
            autoFocus
            value={amountStr === "0" ? "" : amountStr}
            onChange={onAmountInput}
            inputMode="decimal"
            placeholder="0"
            className="w-full bg-transparent text-4xl font-semibold tnum outline-none placeholder:text-text-faint"
            style={{ color: accent === "text" ? undefined : colorVar(accent) }}
          />
          <span className="shrink-0 text-xs text-text-faint">
            {account?.currency_code}
          </span>
        </div>
      </div>

      {/* Transferencia: origen → destino */}
      {type === "transfer" ? (
        <div className="mb-5 space-y-2">
          <AccountRow
            label="Desde"
            accounts={accounts}
            selected={accountId}
            onSelect={setAccountId}
          />
          <div className="flex justify-center text-text-faint">
            <ArrowRight className="h-4 w-4 rotate-90" />
          </div>
          <AccountRow
            label="Hacia"
            accounts={accounts}
            selected={toAccountId}
            onSelect={setToAccountId}
          />
          <p className="pt-1 text-center text-xs text-text-faint">
            Movés plata entre tus cuentas. No cuenta como gasto ni ingreso.
          </p>
        </div>
      ) : (
        <>
          {/* Chips de categoría (gasto) o fuente (ingreso) */}
          {type === "expense" ? (
            <ChipGrid
              items={expenseCategories.map((c) => ({
                id: c.id,
                name: c.name,
                color: c.color,
                icon: c.icon,
              }))}
              selected={categoryId}
              onSelect={setCategoryId}
            />
          ) : (
            <>
              <p className="mb-2 text-xs font-medium text-text-muted">Fuente</p>
              <ChipGrid
                items={incomeItems}
                selected={incomeSourceId}
                onSelect={setIncomeSourceId}
              />
              {isCustomSource && (
                <input
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  placeholder="¿De dónde vino? (ej: cena con amigos)"
                  maxLength={80}
                  className="mt-3 h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm outline-none placeholder:text-text-faint focus:border-accent/50"
                />
              )}
            </>
          )}

          {/* Cuenta */}
          <div className="mb-4 mt-5 border-t border-line pt-4">
            <AccountRow
              label="Cuenta"
              accounts={accounts}
              selected={accountId}
              onSelect={setAccountId}
            />
          </div>
        </>
      )}

      {/* Fecha + nota */}
      <div className="mb-5 flex items-center gap-2">
        <DatePicker date={date} onChange={setDate} />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          maxLength={200}
          className="h-10 flex-1 rounded-lg border border-line bg-surface-2 px-3 text-sm outline-none placeholder:text-text-faint focus:border-accent/50"
        />
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-negative-soft px-3 py-2 text-center text-sm text-negative">
          {error}
        </p>
      )}

      {/* Guardar */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-1 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-semibold text-bg transition active:scale-[0.98] disabled:opacity-60"
        style={{ background: colorVar(saveColor) }}
      >
        {saving ? "Guardando…" : "Guardar"}
      </button>
    </Sheet>
  );
}

/* ---------- Subcomponentes ---------- */

/** Grilla de íconos compacta (celular): categorías de gasto / fuentes. */
function IconGrid({
  items,
  selected,
  onSelect,
}: {
  items: { id: string; name: string; color: string; icon: string }[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {items.map((it) => {
        const active = selected === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onSelect(it.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-2.5 transition active:scale-95",
              active ? "border-transparent" : "border-transparent",
            )}
            style={
              active ? { background: colorSoft(it.color, 18) } : undefined
            }
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full transition"
              style={{
                background: colorSoft(it.color, active ? 32 : 14),
                outline: active ? `2px solid ${colorVar(it.color)}` : "none",
                outlineOffset: "1px",
              }}
            >
              <Icon name={it.icon} className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span
              className={cn(
                "w-full truncate text-center text-[11px] leading-tight",
                active ? "font-medium text-text" : "text-text-muted",
              )}
            >
              {it.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Cuentas en grilla (celular): para origen/destino de transferencia. */
function MobileAccountGrid({
  label,
  accounts,
  selected,
  onSelect,
}: {
  label?: string;
  accounts: AccountWithBalance[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      {label && (
        <p className="mb-1.5 text-xs font-medium text-text-muted">{label}</p>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        {accounts.map((a) => {
          const active = selected === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition active:scale-95",
                active
                  ? "border-transparent text-text"
                  : "border-line text-text-muted",
              )}
              style={
                active
                  ? {
                      background: colorSoft(a.color, 20),
                      borderColor: colorVar(a.color),
                    }
                  : undefined
              }
            >
              <Icon name={a.icon} className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left">{a.name}</span>
              <span className="shrink-0 text-[10px] text-text-faint">
                {a.currency_code}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Chips horizontales (compu). */
function ChipGrid({
  items,
  selected,
  onSelect,
}: {
  items: { id: string; name: string; color: string; icon: string }[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = selected === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onSelect(it.id)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition active:scale-95",
              active
                ? "border-transparent text-text"
                : "border-line text-text-muted",
            )}
            style={
              active
                ? { background: colorSoft(it.color, 22), borderColor: colorVar(it.color) }
                : undefined
            }
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full"
              style={{ background: colorSoft(it.color, 22) }}
            >
              <Icon name={it.icon} className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            {it.name}
          </button>
        );
      })}
    </div>
  );
}

function AccountRow({
  label,
  accounts,
  selected,
  onSelect,
}: {
  label?: string;
  accounts: AccountWithBalance[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      {label && (
        <p className="mb-2 text-xs font-medium text-text-muted">{label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {accounts.map((a) => {
          const active = selected === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                active
                  ? "border-transparent text-text"
                  : "border-line text-text-muted",
              )}
              style={
                active
                  ? { background: colorSoft(a.color, 20), borderColor: colorVar(a.color) }
                  : undefined
              }
            >
              <Icon name={a.icon} className="h-4 w-4" />
              <span className="whitespace-nowrap">{a.name}</span>
              <span className="text-xs text-text-faint">{a.currency_code}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DatePicker({
  date,
  onChange,
}: {
  date: string;
  onChange: (d: string) => void;
}) {
  const today = todayISO();
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const isToday = date === today;
  const isYesterday = date === yesterday;

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-surface-2 p-1">
      <button
        type="button"
        onClick={() => onChange(today)}
        className={cn(
          "h-8 rounded-md px-2.5 text-xs font-medium transition",
          isToday ? "bg-surface-3 text-text" : "text-text-muted",
        )}
      >
        Hoy
      </button>
      <button
        type="button"
        onClick={() => onChange(yesterday)}
        className={cn(
          "h-8 rounded-md px-2.5 text-xs font-medium transition",
          isYesterday ? "bg-surface-3 text-text" : "text-text-muted",
        )}
      >
        Ayer
      </button>
      <label className="relative flex h-8 w-8 items-center justify-center rounded-md text-text-muted">
        <Calendar className="h-4 w-4" />
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
