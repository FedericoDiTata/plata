# 💸 Plata — tus finanzas al día

App de finanzas personales: registrá gastos e ingresos **en 2 toques**, multimoneda,
con presupuestos, metas de ahorro, deudas y gastos fijos. Privada (solo vos ves tus
datos) y **gratis**.

Stack: **Next.js 16 + TypeScript + Tailwind v4** · **Supabase** (PostgreSQL + Auth + RLS) ·
deploy en **Vercel** · instalable como **PWA**.

---

## 🚀 Puesta en marcha (la primera vez, ~10 min)

### Paso 1 — Crear el proyecto en Supabase (gratis)
1. Entrá a **https://supabase.com** → "Start your project" → creá una cuenta.
2. "New project" → ponele un nombre (ej. `plata`), una contraseña de base de datos
   (guardala) y elegí la región más cercana. Esperá ~2 min a que se cree.

### Paso 2 — Crear las tablas
1. En el panel de Supabase, andá a **SQL Editor** (ícono `</>` en la izquierda).
2. Abrí el archivo **`supabase/schema.sql`** de este proyecto, copiá **todo** el contenido.
3. Pegalo en el editor y tocá **Run**. Debería decir "Success". ✅
   (Esto crea todas las tablas, la seguridad por fila, y el sembrado automático de
   categorías/fuentes cuando te registres.)

### Paso 3 — (Opcional pero recomendado) Entrar sin confirmar email
Para que al registrarte entres directo (sin esperar un mail):
- **Authentication → Sign In / Providers → Email** → desactivá **"Confirm email"** → Save.

(Si lo dejás activado, igual funciona: te llega un mail con un link que te loguea.)

### Paso 4 — Conectar la app con tu Supabase
1. En Supabase: **Project Settings → API**. Copiá:
   - **Project URL** (algo como `https://abcd.supabase.co`)
   - **anon public key** (la clave larga `anon` / `public`)
2. En este proyecto, copiá `.env.local.example` como **`.env.local`** y completá:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

### Paso 5 — Correr la app
```bash
npm install      # (ya está hecho, pero por las dudas)
npm run dev
```
Abrí **http://localhost:3000**, tocá **Registrate**, creá tu cuenta y… ¡listo! Ya podés
cargar tu primer gasto con el botón **+**.

---

## ☁️ Subir a internet (Vercel, gratis) — para usarla desde cualquier compu/celu

1. Subí el proyecto a un repo de **GitHub** (privado está perfecto).
2. Entrá a **https://vercel.com** → "Add New Project" → importá ese repo.
3. En **Environment Variables** de Vercel, cargá las mismas 3 variables del `.env.local`,
   pero poné `NEXT_PUBLIC_SITE_URL` con tu dominio de Vercel
   (ej. `https://plata-tuusuario.vercel.app`).
4. **Deploy**. En 1-2 min tenés tu app online.
5. **Importante (auth):** volvé a Supabase → **Authentication → URL Configuration** y
   agregá tu dominio de Vercel en **Site URL** y en **Redirect URLs**
   (ej. `https://plata-tuusuario.vercel.app/**`). Así los links de email funcionan.

> El plan Hobby de Vercel es gratis para uso personal. Supabase free "pausa" el proyecto
> tras 7 días sin uso; se reactiva con 1 clic desde el panel.

---

## 📱 Instalar como app (PWA)
- **Celular (Chrome/Safari):** abrí la URL → menú → "Agregar a pantalla de inicio".
- **Compu (Chrome/Edge):** ícono de instalar en la barra de direcciones.

Se abre a pantalla completa, como una app nativa.

---

## 🗂️ Cómo está organizado el proyecto (para entenderlo)

```
plata/
├─ app/
│  ├─ (auth)/            → login y registro (rutas públicas)
│  ├─ (app)/             → la app protegida (dashboard, movimientos, etc.)
│  │  ├─ layout.tsx      → trae los datos y arma el esqueleto + barra inferior
│  │  ├─ page.tsx        → Dashboard
│  │  ├─ movimientos/    presupuestos/  metas/  deudas/
│  │  ├─ cuentas/        gastos-fijos/  mas/    ajustes/
│  ├─ actions/           → Server Actions (guardar, editar, borrar) — corren en el server
│  ├─ auth/callback/     → procesa el link de confirmación por email
│  └─ api/export/        → descarga tus datos en CSV
├─ components/           → la interfaz (AddSheet = el panel de carga, etc.)
├─ lib/                  → lógica: supabase/, cálculos, formato, tipos
├─ proxy.ts             → seguridad: refresca sesión y bloquea rutas privadas
└─ supabase/schema.sql  → la base de datos
```

**El corazón** está en `components/add/AddSheet.tsx`: el panel de carga rápida. Y la
seguridad real está en la base (Row Level Security) + `proxy.ts`.

---

## ✅ Probar que todo anda
1. Registrate y cargá un **gasto** con el botón **+** (aparece en el Dashboard y en Movimientos).
2. En **Cuentas**, creá una cuenta en USD y otra en ARS; cargá movimientos en ambas.
3. En **Ajustes → Monedas**, tocá **Auto dólar** y mirá cómo se actualiza el patrimonio consolidado.
4. Probá **Presupuestos** (pasate del límite y mirá la alerta), **Metas** (aportá), **Deudas** (marcá saldada) y **Gastos fijos**.
5. **Ajustes → Exportar a CSV** baja todos tus movimientos.
