"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import type { ActionResult } from "@/lib/types";

const schema = z.object({
  category_id: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}-01$/),
  limit_amount: z.number().min(0),
  currency_code: z.string().min(1),
});

export type BudgetInput = z.infer<typeof schema>;

/** Crea o actualiza el presupuesto de una categoría para un mes. */
export async function upsertBudget(input: BudgetInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("budgets")
    .upsert(
      { ...parsed.data, user_id: user.id },
      { onConflict: "user_id,category_id,month" },
    );
  if (error) return { ok: false, error: "No se pudo guardar el presupuesto." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo borrar." };
  revalidatePath("/", "layout");
  return { ok: true };
}
