import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  AccountWithBalance,
  Budget,
  Category,
  Currency,
  Debt,
  Goal,
  GoalContribution,
  IncomeSource,
  RecurringRule,
  Transaction,
} from "./types";

/**
 * OJO con los números: Postgres `numeric` llega a JS como STRING para no
 * perder precisión. Por eso convertimos a número acá, en un solo lugar,
 * y el resto de la app trabaja con números limpios.
 */
const n = (v: unknown): number => (v == null ? 0 : Number(v));

export async function getCurrencies(): Promise<Currency[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("currencies")
    .select("*")
    .order("sort");
  return (data ?? []).map((c) => ({
    ...c,
    rate: n(c.rate),
    decimals: n(c.decimals),
    // "US$" es redundante cuando ya mostramos el código "USD" al lado → "$".
    symbol: c.code === "USD" && c.symbol === "US$" ? "$" : c.symbol,
  }));
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_archived", false)
    .order("sort");
  return data ?? [];
}

export async function getIncomeSources(): Promise<IncomeSource[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("income_sources")
    .select("*")
    .eq("is_archived", false)
    .order("sort");
  return data ?? [];
}

export async function getAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const supabase = await createClient();
  const [{ data: accounts }, { data: balances }] = await Promise.all([
    supabase.from("accounts").select("*").eq("is_archived", false).order("sort"),
    supabase.from("v_account_balances").select("*"),
  ]);

  const balanceByAccount = new Map<string, number>(
    (balances ?? []).map((b) => [b.account_id as string, n(b.balance)]),
  );

  return (accounts ?? []).map((a: Account) => ({
    ...a,
    initial_balance: n(a.initial_balance),
    balance: balanceByAccount.get(a.id) ?? n(a.initial_balance),
  }));
}

/** Trae movimientos (por defecto los últimos 200) con coerción de números. */
export async function getTransactions(opts: {
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<Transaction[]> {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (opts.from) query = query.gte("occurred_on", opts.from);
  if (opts.to) query = query.lte("occurred_on", opts.to);
  query = query.limit(opts.limit ?? 200);

  const { data } = await query;
  return (data ?? []).map((t) => ({
    ...t,
    amount: n(t.amount),
    rate_to_base: n(t.rate_to_base),
    to_amount: t.to_amount == null ? null : n(t.to_amount),
  }));
}

export async function getBudgets(month: string): Promise<Budget[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("budgets")
    .select("*")
    .eq("month", month);
  return (data ?? []).map((b) => ({ ...b, limit_amount: n(b.limit_amount) }));
}

export async function getGoals(): Promise<Goal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map((g) => ({
    ...g,
    target_amount: n(g.target_amount),
    current_amount: n(g.current_amount),
  }));
}

export async function getDebts(): Promise<Debt[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("debts")
    .select("*")
    .order("is_settled")
    .order("created_at", { ascending: false });
  return (data ?? []).map((d) => ({ ...d, amount: n(d.amount) }));
}

/** Historial de aportes a metas. Devuelve [] si la tabla aún no existe. */
export async function getGoalContributions(): Promise<GoalContribution[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goal_contributions")
    .select("*")
    .order("occurred_on", { ascending: false });
  return (data ?? []).map((c) => ({ ...c, amount: n(c.amount) }));
}

export async function getRecurringRules(): Promise<RecurringRule[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recurring_rules")
    .select("*")
    .order("next_run");
  return (data ?? []).map((r) => ({ ...r, amount: n(r.amount) }));
}
