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
