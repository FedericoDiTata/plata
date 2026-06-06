import { getUser } from "@/lib/dal";
import {
  getAccountsWithBalances,
  getCategories,
  getIncomeSources,
  getTransactions,
} from "@/lib/data";

const TYPE_LABEL: Record<string, string> = {
  expense: "Gasto",
  income: "Ingreso",
  transfer: "Transferencia",
};

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  // Escapa comillas y envuelve si hace falta.
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Descarga todos tus movimientos como CSV (abrible en Excel/Sheets). */
export async function GET() {
  const user = await getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const [txs, categories, accounts, sources] = await Promise.all([
    getTransactions({ limit: 100000 }),
    getCategories(),
    getAccountsWithBalances(),
    getIncomeSources(),
  ]);

  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const acctName = new Map(accounts.map((a) => [a.id, a.name]));
  const srcName = new Map(sources.map((s) => [s.id, s.name]));

  const header = [
    "Fecha",
    "Tipo",
    "Monto",
    "Moneda",
    "Categoría",
    "Fuente",
    "Cuenta",
    "Cuenta destino",
    "Nota",
  ];

  const rows = txs.map((t) =>
    [
      t.occurred_on,
      TYPE_LABEL[t.type] ?? t.type,
      t.amount,
      t.currency_code,
      t.category_id ? catName.get(t.category_id) ?? "" : "",
      t.income_source_id ? srcName.get(t.income_source_id) ?? "" : "",
      t.account_id ? acctName.get(t.account_id) ?? "" : "",
      t.to_account_id ? acctName.get(t.to_account_id) ?? "" : "",
      t.note ?? "",
    ]
      .map(csvCell)
      .join(","),
  );

  const csv = "﻿" + [header.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="plata-export.csv"`,
    },
  });
}
