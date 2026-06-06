import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para el NAVEGADOR (componentes "use client").
 * Usa la "anon key", que es pública y segura: el acceso real a los datos
 * lo controla Row Level Security (RLS) en la base. Sin sesión válida, no
 * devuelve nada que no sea tuyo.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
