"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const credsSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type AuthState = { error?: string; message?: string } | undefined;

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Inicia sesión con email + contraseña. */
export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }

  redirect("/");
}

/** Crea una cuenta nueva. Si Supabase pide confirmar email, avisa. */
export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const displayName = (formData.get("display_name") as string)?.trim() || undefined;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { error: "Ya existe una cuenta con ese email." };
    }
    return { error: "No pudimos crear la cuenta. Probá de nuevo." };
  }

  // Si la confirmación de email está activada, no hay sesión todavía.
  if (!data.session) {
    return {
      message:
        "¡Listo! Te enviamos un email para confirmar tu cuenta. Revisá tu bandeja (y spam).",
    };
  }

  redirect("/");
}

/** Cierra la sesión. */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
