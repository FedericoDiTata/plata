import { getProfile } from "@/lib/dal";
import { getCurrencies, getDebts } from "@/lib/data";
import { DebtsManager } from "@/components/debts/DebtsManager";

export default async function DeudasPage() {
  const [profile, currencies, debts] = await Promise.all([
    getProfile(),
    getCurrencies(),
    getDebts(),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Deudas y préstamos</h1>
      <DebtsManager
        debts={debts}
        currencies={currencies}
        baseCurrency={profile?.base_currency ?? "USD"}
      />
    </div>
  );
}
