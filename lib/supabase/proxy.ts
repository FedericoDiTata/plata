import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase en cada request y protege las rutas.
 *
 * Se ejecuta dentro del `proxy.ts` raíz (lo que antes de Next 16 era
 * `middleware.ts`). Dos trabajos:
 *   1) Renueva el token de sesión antes de que expire (si no, el usuario se
 *      "desloguea" solo). Para eso reescribe las cookies en request y response.
 *   2) Si no hay usuario logueado y la ruta es privada → manda a /login.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: no metas código entre crear el cliente y getUser().
  // getUser() revalida el token contra Supabase (no confía solo en la cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/login" ||
    path === "/signup" ||
    path.startsWith("/auth") ||
    path.startsWith("/legal");

  // Ruta privada sin usuario → al login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Usuario logueado entrando a login/signup → al inicio
  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
