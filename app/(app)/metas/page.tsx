import { getProfile } from "@/lib/dal";
import {
  getAccountsWithBalances,
  getCurrencies,
  getGoalContributions,
  getGoals,
} from "@/lib/data";
import { GoalsManager } from "@/components/goals/GoalsManager";

export default async function MetasPage() {
  const [profile, currencies, goals, contributions, accounts] =
    await Promise.all([
      getProfile(),
      getCurrencies(),
      getGoals(),
      getGoalContributions(),
      getAccountsWithBalances(),
    ]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Metas de ahorro</h1>
      <GoalsManager
        goals={goals}
        contributions={contributions}
        accounts={accounts}
        currencies={currencies}
        baseCurrency={profile?.base_currency ?? "USD"}
      />
    </div>
  );
}
