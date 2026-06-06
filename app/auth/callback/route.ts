import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Procesa el retorno del link de confirmación por email (o de un login social
 * a futuro). Intercambia el "code" por una sesión y redirige al inicio.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Algo falló: volvemos al login con un aviso.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
