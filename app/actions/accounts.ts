"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import type { ActionResult } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Poné un nombre").max(40),
  currency_code: z.string().min(1),
  type: z.enum(["cash", "bank", "wallet", "crypto", "investment", "other"]),
  initial_balance: z.number().default(0),
  color: z.string().default("cat-1"),
  icon: z.string().default("wallet"),
});

export type AccountInput = z.infer<typeof schema>;

export async function createAccount(input: AccountInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .insert({ ...parsed.data, user_id: user.id });
  if (error) return { ok: false, error: "No se pudo crear la cuenta." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateAccount(
  id: string,
  input: AccountInput,
): Promise<ActionResult> {
  await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Archiva (oculta) una cuenta sin borrar su historial. */
export async function setAccountArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({ is_archived: archived })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo archivar." };
  revalidatePath("/", "layout");
  return { ok: true };
}
