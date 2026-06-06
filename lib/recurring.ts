import "server-only";
import { addDays, addMonths, format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/dal";
import { todayISO } from "@/lib/format";

/**
 * "Materialización perezosa" de gastos/ingresos fijos.
 *
 * En vez de un cron en un servidor (que cuesta plata), cada vez que abrís la
 * app revisamos las reglas recurrentes vencidas y creamos los movimientos que
 * falten. Si no abriste la app por 3 meses, genera los 3 de una.
 */
export async function runDueRecurring(): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const supabase = await createClient();
  const today = todayISO();

  const { data: rules } = await supabase
    .from("recurring_rules")
    .select("*")
    .eq("is_active", true)
    .lte("next_run", today);

  if (!rules || rules.length === 0) return;

  // Mapa de cotizaciones para congelar rate_to_base por moneda.
  const { data: currencies } = await supabase
    .from("currencies")
    .select("code, rate");
  const rateByCode = new Map<string, number>(
    (currencies ?? []).map((c) => [c.code as string, Number(c.rate)]),
  );

  const toInsert: Record<string, unknown>[] = [];
  const updates: { id: string; next_run: string }[] = [];

  for (const rule of rules) {
    let next = parseISO(rule.next_run);
    let guard = 0; // evita bucles infinitos

    while (format(next, "yyyy-MM-dd") <= today && guard < 36) {
      const occurredOn = format(next, "yyyy-MM-dd");
      toInsert.push({
        user_id: user.id,
        type: rule.type,
        amount: rule.amount,
        currency_code: rule.currency_code,
        rate_to_base: rateByCode.get(rule.currency_code) ?? 1,
        account_id: rule.account_id,
        category_id: rule.type === "expense" ? rule.category_id : null,
        income_source_id: rule.type === "income" ? rule.income_source_id : null,
        note: rule.note,
        occurred_on: occurredOn,
        recurring_id: rule.id,
      });
      next = rule.frequency === "weekly" ? addDays(next, 7) : addMonths(next, 1);
      guard++;
    }

    updates.push({ id: rule.id, next_run: format(next, "yyyy-MM-dd") });
  }

  if (toInsert.length > 0) {
    await supabase.from("transactions").insert(toInsert);
    // Actualizamos el próximo vencimiento de cada regla.
    await Promise.all(
      updates.map((u) =>
        supabase
          .from("recurring_rules")
          .update({ next_run: u.next_run })
          .eq("id", u.id),
      ),
    );
  }
}
