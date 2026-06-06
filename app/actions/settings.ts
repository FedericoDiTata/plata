"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import type { ActionResult } from "@/lib/types";

function ok(): ActionResult {
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ----------------------- Perfil ----------------------- */

export async function updateProfile(input: {
  display_name?: string;
  base_currency?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.display_name !== undefined) patch.display_name = input.display_name.trim();
  if (input.base_currency) patch.base_currency = input.base_currency;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { ok: false, error: "No se pudo guardar el perfil." };

  // La moneda base siempre tiene cotización 1 respecto de sí misma.
  if (input.base_currency) {
    await supabase
      .from("currencies")
      .update({ rate: 1 })
      .eq("code", input.base_currency);
  }
  return ok();
}

/* ----------------------- Monedas ----------------------- */

const currencySchema = z.object({
  code: z.string().min(2).max(8).transform((s) => s.toUpperCase().trim()),
  name: z.string().min(1).max(30),
  symbol: z.string().min(1).max(6),
  decimals: z.number().int().min(0).max(8),
  rate: z.number().positive(),
});

export async function addCurrency(
  input: z.input<typeof currencySchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = currencySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("currencies")
    .insert({ ...parsed.data, user_id: user.id });
  if (error) return { ok: false, error: "Ya existe esa moneda o hubo un error." };
  return ok();
}

export async function updateCurrencyRate(
  id: string,
  rate: number,
): Promise<ActionResult> {
  await requireUser();
  if (!(rate > 0)) return { ok: false, error: "La cotización debe ser mayor a 0." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("currencies")
    .update({ rate, rate_updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  return ok();
}

export async function deleteCurrency(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("currencies").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo borrar (¿hay cuentas en esa moneda?)." };
  return ok();
}

/**
 * Trae la cotización del dólar blue (gratis, sin API key) y actualiza la
 * relación ARS↔USD según tu moneda base. Devuelve el valor usado.
 */
export async function refreshDolarBlue(): Promise<
  ActionResult & { value?: number }
> {
  await requireUser();
  let venta: number;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch("https://dolarapi.com/v1/dolares/blue", {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    const json = (await res.json()) as { venta?: number };
    if (!json.venta) throw new Error("sin dato");
    venta = json.venta;
  } catch {
    return { ok: false, error: "No se pudo obtener el dólar. Probá cargarlo a mano." };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("base_currency")
    .single();
  const base = profile?.base_currency ?? "USD";

  if (base === "USD") {
    // 1 ARS = 1/venta USD
    await supabase
      .from("currencies")
      .update({ rate: 1 / venta, rate_updated_at: new Date().toISOString() })
      .eq("code", "ARS");
  } else if (base === "ARS") {
    // 1 USD = venta ARS
    await supabase
      .from("currencies")
      .update({ rate: venta, rate_updated_at: new Date().toISOString() })
      .eq("code", "USD");
  }
  revalidatePath("/", "layout");
  return { ok: true, value: venta };
}

/* ----------------------- Categorías ----------------------- */

export async function addCategory(input: {
  name: string;
  kind: "expense" | "income";
  icon?: string;
  color?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!input.name.trim()) return { ok: false, error: "Poné un nombre." };
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: input.name.trim(),
    kind: input.kind,
    icon: input.icon ?? "circle",
    color: input.color ?? "cat-12",
  });
  if (error) return { ok: false, error: "No se pudo crear la categoría." };
  return ok();
}

export async function archiveCategory(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_archived: true })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo archivar." };
  return ok();
}

/* ----------------------- Fuentes de ingreso ----------------------- */

export async function addIncomeSource(input: {
  name: string;
  color?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!input.name.trim()) return { ok: false, error: "Poné un nombre." };
  const supabase = await createClient();
  const { error } = await supabase.from("income_sources").insert({
    user_id: user.id,
    name: input.name.trim(),
    color: input.color ?? "cat-2",
  });
  if (error) return { ok: false, error: "No se pudo crear la fuente." };
  return ok();
}

export async function archiveIncomeSource(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("income_sources")
    .update({ is_archived: true })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo archivar." };
  return ok();
}
