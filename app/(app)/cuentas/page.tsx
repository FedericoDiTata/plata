import { getAccountsWithBalances, getCurrencies } from "@/lib/data";
import { AccountsManager } from "@/components/accounts/AccountsManager";

export default async function CuentasPage() {
  const [accounts, currencies] = await Promise.all([
    getAccountsWithBalances(),
    getCurrencies(),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Cuentas</h1>
      <AccountsManager accounts={accounts} currencies={currencies} />
    </div>
  );
}
