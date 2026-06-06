"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  addDays,
  addMonths,
  format,
  getDaysInMonth,
  isBefore,
  setDate,
  startOfDay,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import type { ActionResult } from "@/lib/types";

const schema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.number().positive(),
  currency_code: z.string().min(1),
  account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  income_source_id: z.string().uuid().nullable().optional(),
  note: z.string().max(200).nullable().optional(),
  frequency: z.enum(["monthly", "weekly"]),
  day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  weekday: z.number().int().min(0).max(6).nullable().optional(),
});

export type RecurringInput = z.infer<typeof schema>;

/** Calcula el próximo vencimiento (hoy o futuro). */
function computeNextRun(
  frequency: "monthly" | "weekly",
  dom: number | null | undefined,
  weekday: number | null | undefined,
): string {
  const today = startOfDay(new Date());

  if (frequency === "weekly") {
    const wd = weekday ?? today.getDay();
    const diff = (wd - today.getDay() + 7) % 7;
    return format(addDays(today, diff), "yyyy-MM-dd");
  }

  const day = dom ?? today.getDate();
  const clamp = (d: Date) => Math.min(day, getDaysInMonth(d));
  let next = setDate(today, clamp(today));
  if (isBefore(next, today)) {
    const nm = addMonths(today, 1);
    next = setDate(nm, clamp(nm));
  }
  return format(next, "yyyy-MM-dd");
}

export async function createRecurringRule(
  input: RecurringInput,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const r = parsed.data;

  const next_run = computeNextRun(r.frequency, r.day_of_month, r.weekday);
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_rules").insert({
    user_id: user.id,
    type: r.type,
    amount: r.amount,
    currency_code: r.currency_code,
    account_id: r.account_id ?? null,
    category_id: r.type === "expense" ? r.category_id ?? null : null,
    income_source_id: r.type === "income" ? r.income_source_id ?? null : null,
    note: r.note ?? null,
    frequency: r.frequency,
    day_of_month: r.frequency === "monthly" ? r.day_of_month ?? null : null,
    weekday: r.frequency === "weekly" ? r.weekday ?? null : null,
    next_run,
  });
  if (error) return { ok: false, error: "No se pudo crear el gasto fijo." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleRecurringRule(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_rules")
    .update({ is_active: active })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteRecurringRule(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_rules").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo borrar." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Registra el pago de un gasto fijo: crea el movimiento desde la cuenta elegida. */
export async function payRecurring(
  ruleId: string,
  accountId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: rule } = await supabase
    .from("recurring_rules")
    .select("*")
    .eq("id", ruleId)
    .single();
  if (!rule) return { ok: false, error: "Gasto fijo no encontrado." };

  const { data: cur } = await supabase
    .from("currencies")
    .select("rate")
    .eq("code", rule.currency_code)
    .single();
  const rate_to_base = cur ? Number(cur.rate) : 1;

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: rule.type,
    amount: rule.amount,
    currency_code: rule.currency_code,
    rate_to_base,
    account_id: accountId || rule.account_id,
    category_id: rule.type === "expense" ? rule.category_id : null,
    income_source_id: rule.type === "income" ? rule.income_source_id : null,
    note: rule.note,
    occurred_on: format(new Date(), "yyyy-MM-dd"),
    recurring_id: ruleId,
  });
  if (error) return { ok: false, error: "No se pudo registrar el pago." };

  revalidatePath("/", "layout");
  return { ok: true };
}
