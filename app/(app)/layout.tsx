import { requireUser } from "@/lib/dal";
import {
  getAccountsWithBalances,
  getCategories,
  getCurrencies,
  getIncomeSources,
} from "@/lib/data";
import { AppShell, type AppData } from "@/components/app/AppShell";

// Esta ruta es privada: si no hay sesión, requireUser redirige a /login.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  const [accounts, categories, incomeSources, currencies] = await Promise.all([
    getAccountsWithBalances(),
    getCategories(),
    getIncomeSources(),
    getCurrencies(),
  ]);

  const data: AppData = {
    accounts,
    expenseCategories: categories.filter((c) => c.kind === "expense"),
    incomeCategories: categories.filter((c) => c.kind === "income"),
    incomeSources,
    currencies,
  };

  return <AppShell data={data}>{children}</AppShell>;
}
