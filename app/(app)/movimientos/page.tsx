import {
  getAccountsWithBalances,
  getCategories,
  getCurrencies,
  getIncomeSources,
  getTransactions,
} from "@/lib/data";
import { MovementsList } from "@/components/movements/MovementsList";

export default async function MovimientosPage() {
  const [transactions, categories, accounts, incomeSources, currencies] =
    await Promise.all([
      getTransactions({ limit: 300 }),
      getCategories(),
      getAccountsWithBalances(),
      getIncomeSources(),
      getCurrencies(),
    ]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Movimientos</h1>
      <MovementsList
        transactions={transactions}
        categories={categories}
        accounts={accounts}
        incomeSources={incomeSources}
        currencies={currencies}
      />
    </div>
  );
}
