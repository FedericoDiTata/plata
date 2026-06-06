import {
  getAccountsWithBalances,
  getCategories,
  getCurrencies,
  getIncomeSources,
  getRecurringRules,
} from "@/lib/data";
import { RecurringManager } from "@/components/recurring/RecurringManager";

export default async function GastosFijosPage() {
  const [rules, accounts, categories, incomeSources, currencies] =
    await Promise.all([
      getRecurringRules(),
      getAccountsWithBalances(),
      getCategories(),
      getIncomeSources(),
      getCurrencies(),
    ]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Gastos fijos</h1>
      <RecurringManager
        rules={rules}
        accounts={accounts}
        expenseCategories={categories.filter((c) => c.kind === "expense")}
        incomeSources={incomeSources}
        currencies={currencies}
      />
    </div>
  );
}
