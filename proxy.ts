import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Proxy (antes "middleware" en Next < 16).
 * Corre antes de renderizar cada ruta. Acá refrescamos la sesión de Supabase
 * y bloqueamos el acceso a rutas privadas. Runtime: Node.js (no configurable).
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Corre en todas las rutas MENOS:
     * - _next/static, _next/image (assets del build)
     * - favicon, manifest, íconos e imágenes (para que carguen sin sesión)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
