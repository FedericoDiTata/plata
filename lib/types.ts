// Tipos de TypeScript que reflejan las tablas de la base.
// Tenerlos centralizados nos da autocompletado y errores en tiempo de
// compilación si una consulta no coincide con la forma real de los datos.

/** Resultado estándar de una acción de servidor. */
export type ActionResult = { ok: boolean; error?: string };

export type TxType = "expense" | "income" | "transfer";
export type CategoryKind = "expense" | "income";
export type DebtKind = "they_owe" | "i_owe";
export type Frequency = "monthly" | "weekly";
export type AccountType =
  | "cash"
  | "bank"
  | "wallet"
  | "crypto"
  | "investment"
  | "other";

export interface Profile {
  id: string;
  display_name: string | null;
  base_currency: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface Currency {
  id: string;
  user_id: string;
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  rate: number; // valor de 1 unidad en moneda base
  rate_updated_at: string | null;
  sort: number;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  is_archived: boolean;
  sort: number;
  created_at: string;
}

export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_archived: boolean;
  sort: number;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  currency_code: string;
  type: AccountType;
  initial_balance: number;
  color: string;
  icon: string;
  is_archived: boolean;
  sort: number;
  created_at: string;
}

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TxType;
  amount: number;
  currency_code: string;
  rate_to_base: number;
  account_id: string | null;
  to_account_id: string | null;
  to_amount: number | null;
  category_id: string | null;
  income_source_id: string | null;
  note: string | null;
  occurred_on: string; // 'YYYY-MM-DD'
  recurring_id: string | null;
  created_at: string;
}

export interface RecurringRule {
  id: string;
  user_id: string;
  type: CategoryKind;
  amount: number;
  currency_code: string;
  account_id: string | null;
  category_id: string | null;
  income_source_id: string | null;
  note: string | null;
  frequency: Frequency;
  day_of_month: number | null;
  weekday: number | null;
  next_run: string;
  is_active: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: string; // 'YYYY-MM-01'
  limit_amount: number;
  currency_code: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency_code: string;
  target_date: string | null;
  color: string;
  is_done: boolean;
  created_at: string;
}

export interface GoalContribution {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  occurred_on: string;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  kind: DebtKind;
  counterparty: string;
  amount: number;
  currency_code: string;
  due_date: string | null;
  is_settled: boolean;
  note: string | null;
  created_at: string;
}
