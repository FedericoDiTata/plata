import Link from "next/link";
import {
  Target,
  HandCoins,
  Wallet,
  Repeat,
  Settings,
  ChevronRight,
} from "lucide-react";

const LINKS = [
  { href: "/metas", label: "Metas de ahorro", desc: "Objetivos y progreso", icon: Target },
  { href: "/deudas", label: "Deudas y préstamos", desc: "Te deben / debés", icon: HandCoins },
  { href: "/cuentas", label: "Cuentas", desc: "Billeteras y saldos", icon: Wallet },
  { href: "/gastos-fijos", label: "Gastos fijos", desc: "Se cargan solos cada período", icon: Repeat },
  { href: "/ajustes", label: "Ajustes", desc: "Perfil, monedas, datos", icon: Settings },
];

export default function MasPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Más</h1>
      <div className="card divide-y divide-line">
        {LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-3 px-4 py-3.5 transition active:bg-surface-2"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2">
                <Icon className="h-5 w-5 text-text-muted" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium">{l.label}</span>
                <span className="block text-xs text-text-faint">{l.desc}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-text-faint" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
