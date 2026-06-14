"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import type { ActionResult } from "@/lib/types";

const schema = z.object({
  kind: z.enum(["they_owe", "i_owe"]),
  counterparty: z.string().min(1, "¿Quién?").max(60),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  currency_code: z.string().min(1),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  note: z.string().max(200).nullable().optional(),
});

export type DebtInput = z.infer<typeof schema>;

export async function createDebt(input: DebtInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("debts")
    .insert({ ...parsed.data, user_id: user.id });
  if (error) return { ok: false, error: "No se pudo crear." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setDebtSettled(
  id: string,
  settled: boolean,
): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("debts")
    .update({ is_settled: settled })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteDebt(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("debts").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo borrar." };
  revalidatePath("/", "layout");
  return { ok: true };
}

const DEUDA_LABEL = "Deuda";
type DbClient = Awaited<ReturnType<typeof createClient>>;

/** Id de la categoría de gasto "Deuda" del usuario (la crea si no existe). */
async function ensureDeudaCategory(db: DbClient, userId: string): Promise<string> {
  const { data: existing } = await db
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "expense")
    .eq("name", DEUDA_LABEL)
    .limit(1)
    .maybeSingle();
  if (existing?.id) {
    await db.from("categories").update({ is_archived: false }).eq("id", existing.id);
    return existing.id as string;
  }
  const { data: created } = await db
    .from("categories")
    .insert({
      user_id: userId,
      name: DEUDA_LABEL,
      kind: "expense",
      icon: "coins",
      color: "cat-4",
    })
    .select("id")
    .single();
  return created!.id as string;
}

/** Id de la fuente de ingreso "Deuda" del usuario (la crea si no existe). */
async function ensureDeudaSource(db: DbClient, userId: string): Promise<string> {
  const { data: existing } = await db
    .from("income_sources")
    .select("id")
    .eq("user_id", userId)
    .eq("name", DEUDA_LABEL)
    .limit(1)
    .maybeSingle();
  if (existing?.id) {
    await db.from("income_sources").update({ is_archived: false }).eq("id", existing.id);
    return existing.id as string;
  }
  const { data: created } = await db
    .from("income_sources")
    .insert({ user_id: userId, name: DEUDA_LABEL, color: "cat-4" })
    .select("id")
    .single();
  return created!.id as string;
}

/**
 * Salda una deuda y (opcional) registra el movimiento real, clasificándolo
 * en la categoría/fuente "Deuda" para que no aparezca como "Sin categoría".
 */
export async function settleDebt(
  id: string,
  opts: { register: boolean; accountId?: string | null },
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: debt } = await supabase
    .from("debts")
    .select("*")
    .eq("id", id)
    .single();
  if (!debt) return { ok: false, error: "No se encontró la deuda." };

  if (opts.register && opts.accountId) {
    const isIncoming = debt.kind === "they_owe";
    const { data: cur } = await supabase
      .from("currencies")
      .select("rate")
      .eq("code", debt.currency_code)
      .single();
    const rate_to_base = cur ? Number(cur.rate) : 1;

    const category_id = isIncoming
      ? null
      : await ensureDeudaCategory(supabase, user.id);
    const income_source_id = isIncoming
      ? await ensureDeudaSource(supabase, user.id)
      : null;

    const { error: txErr } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: isIncoming ? "income" : "expense",
      amount: Number(debt.amount),
      currency_code: debt.currency_code,
      rate_to_base,
      account_id: opts.accountId,
      category_id,
      income_source_id,
      note: `${isIncoming ? "Cobro" : "Pago"} de deuda · ${debt.counterparty}`,
      occurred_on: new Date().toISOString().slice(0, 10),
    });
    if (txErr) return { ok: false, error: "No se pudo registrar el movimiento." };
  }

  const { error } = await supabase
    .from("debts")
    .update({ is_settled: true })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo saldar la deuda." };
  revalidatePath("/", "layout");
  return { ok: true };
}
