"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ArrowLeftRight,
  PieChart,
  LayoutGrid,
  Plus,
  Target,
  HandCoins,
  Wallet,
  Repeat,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { AddSheet } from "@/components/add/AddSheet";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import type {
  AccountWithBalance,
  Category,
  Currency,
  IncomeSource,
} from "@/lib/types";

export interface AppData {
  accounts: AccountWithBalance[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  incomeSources: IncomeSource[];
  currencies: Currency[];
}

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_BOTTOM: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/presupuestos", label: "Presupuestos", icon: PieChart },
  { href: "/mas", label: "Más", icon: LayoutGrid },
];

// Barra lateral agrupada por secciones (desktop).
const NAV_SECTIONS: { title: string | null; items: NavItem[] }[] = [
  {
    title: null,
    items: [
      { href: "/", label: "Inicio", icon: Home },
      { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
    ],
  },
  {
    title: "Planificación",
    items: [
      { href: "/presupuestos", label: "Presupuestos", icon: PieChart },
      { href: "/metas", label: "Metas", icon: Target },
      { href: "/gastos-fijos", label: "Gastos fijos", icon: Repeat },
    ],
  },
  {
    title: "Registro",
    items: [
      { href: "/deudas", label: "Deudas", icon: HandCoins },
      { href: "/cuentas", label: "Cuentas", icon: Wallet },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({
  data,
  children,
}: {
  data: AppData;
  children: React.ReactNode;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* ===== Barra lateral (desktop) ===== */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/50 p-4 backdrop-blur-lg lg:flex">
        <div className="mb-6 flex items-center gap-2 px-2 pt-2">
          <span className="grad-violet flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold text-bg">
            $
          </span>
          <span className="text-lg font-semibold">Plata</span>
        </div>

        <button
          onClick={() => setAddOpen(true)}
          className="grad-violet mb-5 flex h-11 items-center justify-center gap-2 rounded-xl font-semibold text-bg transition active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" strokeWidth={2.6} /> Agregar
        </button>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
          {NAV_SECTIONS.map((section, i) => (
            <div key={i} className="flex flex-col gap-1">
              {section.title && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-faint">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-surface-2 text-accent"
                        : "text-text-muted hover:bg-surface-2/60 hover:text-text",
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Pie: ajustes + cerrar sesión */}
        <div className="mt-4 flex flex-col gap-1 border-t border-line pt-3">
          <Link
            href="/ajustes"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              isActive(pathname, "/ajustes")
                ? "bg-surface-2 text-accent"
                : "text-text-muted hover:bg-surface-2/60 hover:text-text",
            )}
          >
            <Settings className="h-5 w-5" /> Ajustes
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted transition hover:bg-surface-2/60 hover:text-negative"
            >
              <LogOut className="h-5 w-5" /> Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* ===== Contenido ===== */}
      <main className="px-4 pb-28 pt-5 lg:pb-14 lg:pl-64">
        <div className="mx-auto w-full max-w-[520px] lg:max-w-[1500px] lg:px-8 lg:pt-2">
          {children}
        </div>
      </main>

      {/* ===== Barra inferior (mobile) ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[520px] items-center justify-around border-t border-line bg-surface/90 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-lg lg:hidden">
        {NAV_BOTTOM.slice(0, 2).map((item) => (
          <NavTab key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Agregar movimiento"
          className="grad-violet -mt-7 flex h-14 w-14 items-center justify-center rounded-full text-bg shadow-lg shadow-accent/40 transition active:scale-90"
        >
          <Plus className="h-7 w-7" strokeWidth={2.6} />
        </button>
        {NAV_BOTTOM.slice(2).map((item) => (
          <NavTab key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      <AddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        accounts={data.accounts}
        expenseCategories={data.expenseCategories}
        incomeCategories={data.incomeCategories}
        incomeSources={data.incomeSources}
        currencies={data.currencies}
      />
    </>
  );
}

function NavTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex w-16 flex-col items-center gap-1 py-1 text-[10px] font-medium transition",
        active ? "text-accent" : "text-text-faint",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      {item.label}
    </Link>
  );
}
