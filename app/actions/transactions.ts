"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import type { ActionResult } from "@/lib/types";

const txSchema = z.object({
  type: z.enum(["expense", "income", "transfer"]),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  currency_code: z.string().min(1),
  account_id: z.string().uuid().nullable().optional(),
  to_account_id: z.string().uuid().nullable().optional(),
  to_amount: z.number().positive().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  income_source_id: z.string().uuid().nullable().optional(),
  note: z.string().max(200).nullable().optional(),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type TxInput = z.infer<typeof txSchema>;

function revalidateAll() {
  // Refresca dashboard, movimientos, cuentas, presupuestos, etc.
  revalidatePath("/", "layout");
}

/** Crea un movimiento (gasto, ingreso o transferencia). */
export async function createTransaction(input: TxInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = txSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const tx = parsed.data;
  const supabase = await createClient();

  // Congelamos la cotización del momento (valor de 1 unidad en moneda base).
  const { data: cur } = await supabase
    .from("currencies")
    .select("rate")
    .eq("code", tx.currency_code)
    .single();
  const rate_to_base = cur ? Number(cur.rate) : 1;

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: tx.type,
    amount: tx.amount,
    currency_code: tx.currency_code,
    rate_to_base,
    account_id: tx.account_id ?? null,
    to_account_id: tx.type === "transfer" ? tx.to_account_id ?? null : null,
    to_amount: tx.type === "transfer" ? tx.to_amount ?? tx.amount : null,
    category_id: tx.type !== "transfer" ? tx.category_id ?? null : null,
    income_source_id: tx.type === "income" ? tx.income_source_id ?? null : null,
    note: tx.note ?? null,
    occurred_on: tx.occurred_on,
  });

  if (error) return { ok: false, error: "No se pudo guardar el movimiento." };
  revalidateAll();
  return { ok: true };
}

/** Edita un movimiento existente. */
export async function updateTransaction(
  id: string,
  input: TxInput,
): Promise<ActionResult> {
  await requireUser();
  const parsed = txSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const tx = parsed.data;
  const supabase = await createClient();

  const { data: cur } = await supabase
    .from("currencies")
    .select("rate")
    .eq("code", tx.currency_code)
    .single();
  const rate_to_base = cur ? Number(cur.rate) : 1;

  const { error } = await supabase
    .from("transactions")
    .update({
      type: tx.type,
      amount: tx.amount,
      currency_code: tx.currency_code,
      rate_to_base,
      account_id: tx.account_id ?? null,
      to_account_id: tx.type === "transfer" ? tx.to_account_id ?? null : null,
      to_amount: tx.type === "transfer" ? tx.to_amount ?? tx.amount : null,
      category_id: tx.type !== "transfer" ? tx.category_id ?? null : null,
      income_source_id: tx.type === "income" ? tx.income_source_id ?? null : null,
      note: tx.note ?? null,
      occurred_on: tx.occurred_on,
    })
    .eq("id", id);

  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidateAll();
  return { ok: true };
}

/** Borra un movimiento. */
export async function deleteTransaction(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo borrar." };
  revalidateAll();
  return { ok: true };
}
