"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import type { ActionResult } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Poné un nombre").max(60),
  target_amount: z.number().positive("El objetivo debe ser mayor a 0"),
  currency_code: z.string().min(1),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  color: z.string().default("cat-1"),
});

export type GoalInput = z.infer<typeof schema>;

export async function createGoal(input: GoalInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .insert({ ...parsed.data, user_id: user.id });
  if (error) return { ok: false, error: "No se pudo crear la meta." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Suma (o resta, con monto negativo) un aporte a la meta y lo registra. */
export async function contributeGoal(
  id: string,
  delta: number,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: goal } = await supabase
    .from("goals")
    .select("current_amount, target_amount")
    .eq("id", id)
    .single();
  if (!goal) return { ok: false, error: "Meta no encontrada." };

  const next = Math.max(0, Number(goal.current_amount) + delta);
  const { error } = await supabase
    .from("goals")
    .update({ current_amount: next, is_done: next >= Number(goal.target_amount) })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo aportar." };

  // Registramos el aporte en el historial (si corriste la migración 02).
  // Si la tabla no existe todavía, Supabase devuelve error pero no rompe.
  await supabase
    .from("goal_contributions")
    .insert({ user_id: user.id, goal_id: id, amount: delta });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Marca una meta como cumplida (o la reabre). Ej: "ya compré la PS5". */
export async function toggleGoalDone(
  id: string,
  done: boolean,
): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({ is_done: done })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo borrar." };
  revalidatePath("/", "layout");
  return { ok: true };
}
