"use client";

import { useActionState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { login, signup, type AuthState } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );

  const isLogin = mode === "login";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm"
    >
      {/* Marca */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-2xl">
          💸
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Plata</h1>
        <p className="mt-1 text-sm text-text-muted">
          {isLogin ? "Entrá a tus finanzas" : "Creá tu cuenta gratis"}
        </p>
      </div>

      <form action={formAction} className="card p-6">
        {!isLogin && (
          <Field
            label="Nombre"
            name="display_name"
            type="text"
            placeholder="Cómo te llamás"
            autoComplete="name"
          />
        )}

        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="vos@email.com"
          autoComplete="email"
          required
        />

        <Field
          label="Contraseña"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
        />

        {state?.error && (
          <p className="mt-3 rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
            {state.error}
          </p>
        )}
        {state?.message && (
          <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-accent font-semibold text-bg transition active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Un segundo…" : isLogin ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        {isLogin ? (
          <>
            ¿No tenés cuenta?{" "}
            <Link href="/signup" className="font-medium text-accent">
              Registrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-medium text-accent">
              Entrá
            </Link>
          </>
        )}
      </p>
    </motion.div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="mb-4 block last:mb-0">
      <span className="mb-1.5 block text-xs font-medium text-text-muted">
        {label}
      </span>
      <input
        {...props}
        className="h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-text outline-none transition placeholder:text-text-faint focus:border-accent/60 focus:bg-surface-3"
      />
    </label>
  );
}
