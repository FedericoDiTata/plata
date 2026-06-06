import { endOfMonth, format, startOfMonth } from "date-fns";
import { getProfile } from "@/lib/dal";
import { getBudgets, getCategories, getCurrencies, getTransactions } from "@/lib/data";
import { expenseByCategory } from "@/lib/calc";
import { monthLabel, monthKey } from "@/lib/format";
import { BudgetsManager } from "@/components/budgets/BudgetsManager";

export default async function PresupuestosPage() {
  const now = new Date();
  const month = monthKey(now);
  const from = format(startOfMonth(now), "yyyy-MM-dd");
  const to = format(endOfMonth(now), "yyyy-MM-dd");

  const [profile, currencies, categories, budgets, monthTxs] = await Promise.all([
    getProfile(),
    getCurrencies(),
    getCategories(),
    getBudgets(month),
    getTransactions({ from, to, limit: 1000 }),
  ]);

  const expenseCategories = categories.filter((c) => c.kind === "expense");

  // Gasto por categoría en moneda base.
  const spentBaseByCat: Record<string, number> = {};
  for (const slice of expenseByCategory(monthTxs, currencies)) {
    if (slice.categoryId) spentBaseByCat[slice.categoryId] = slice.total;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold">Presupuestos</h1>
        <p className="text-sm capitalize text-text-muted">{monthLabel(now)}</p>
      </header>

      <BudgetsManager
        categories={expenseCategories}
        budgets={budgets}
        spentBaseByCat={spentBaseByCat}
        currencies={currencies}
        baseCurrency={profile?.base_currency ?? "USD"}
        month={month}
      />
    </div>
  );
}
