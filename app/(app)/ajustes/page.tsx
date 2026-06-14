import { Download, LogOut } from "lucide-react";
import { getProfile, getUser } from "@/lib/dal";
import { getCategories, getCurrencies, getIncomeSources } from "@/lib/data";
import { logout } from "@/app/actions/auth";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { CurrenciesManager } from "@/components/settings/CurrenciesManager";
import { TaxonomyManager } from "@/components/settings/TaxonomyManager";

export default async function AjustesPage() {
  const [user, profile, currencies, categories, incomeSources] =
    await Promise.all([
      getUser(),
      getProfile(),
      getCurrencies(),
      getCategories(),
      getIncomeSources(),
    ]);

  const base = profile?.base_currency ?? "USD";

  return (
    <div className="space-y-7 pb-4">
      <h1 className="text-xl font-semibold">Ajustes</h1>

      <Section title="Perfil">
        <ProfileForm
          displayName={profile?.display_name ?? ""}
          baseCurrency={base}
          currencies={currencies}
        />
      </Section>

      <Section title="Monedas y cotizaciones">
        <CurrenciesManager currencies={currencies} baseCurrency={base} />
      </Section>

      <Section title="Categorías y fuentes">
        <TaxonomyManager
          expenseCategories={categories.filter((c) => c.kind === "expense")}
          incomeSources={incomeSources}
        />
      </Section>

      <Section title="Tus datos">
        <a
          href="/api/export"
          className="card flex items-center gap-3 p-4 transition active:bg-surface-2"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2">
            <Download className="h-5 w-5 text-text-muted" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-medium">Exportar a CSV</span>
            <span className="block text-xs text-text-faint">
              Descargá todos tus movimientos (abrible en Excel)
            </span>
          </span>
        </a>
      </Section>

      <Section title="Cuenta">
        <div className="card p-4">
          <p className="mb-3 text-sm text-text-muted">{user?.email}</p>
          <form action={logout}>
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-medium text-negative transition active:scale-[0.99]"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      </Section>

      <p className="pt-2 text-center text-xs text-text-faint">
        Plata · tus finanzas, privadas y al día.
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-text-muted">{title}</h2>
      {children}
    </section>
  );
}
