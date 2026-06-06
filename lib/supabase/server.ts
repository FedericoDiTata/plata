import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para el SERVIDOR (Server Components, Server Actions,
 * Route Handlers). Lee la sesión desde las cookies.
 *
 * Nota Next.js 16: `cookies()` ahora es asíncrono → hay que usar `await`.
 *
 * El `setAll` puede fallar cuando se llama desde un Server Component (ahí no
 * se pueden escribir cookies). Lo envolvemos en try/catch: el refresco real
 * de la sesión lo hace el `proxy.ts`, así que es seguro ignorar ese error.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: lo maneja el proxy.
          }
        },
      },
    },
  );
}
