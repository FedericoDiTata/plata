import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "./types";

/**
 * Devuelve el usuario autenticado (o null). Cacheado por render con
 * React `cache`: si se llama varias veces en una misma página, consulta
 * a Supabase una sola vez.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Como getUser pero redirige a /login si no hay sesión. Para rutas privadas. */
export const requireUser = cache(async () => {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
});

/** Trae el perfil del usuario (moneda base, nombre, tema). */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").single();
  return data;
});
