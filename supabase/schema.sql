-- ============================================================
-- PLATA — Esquema de base de datos (PostgreSQL / Supabase)
-- ------------------------------------------------------------
-- Cómo se usa: copiá TODO este archivo y pegalo en el
-- "SQL Editor" de tu proyecto Supabase, y dale "Run".
-- Es idempotente en lo posible (se puede correr de nuevo).
--
-- Conceptos clave:
--  * Cada tabla tiene `user_id` y RLS (Row Level Security):
--    una política deja que cada usuario SOLO toque sus propias filas.
--  * Cuando un usuario se registra, un trigger crea su perfil y
--    siembra monedas, categorías y fuentes de ingreso por defecto.
-- ============================================================

-- Extensión para generar UUIDs
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Función genérica: mantener `updated_at` al día
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 1) PERFIL  (1 fila por usuario)
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  base_currency text not null default 'USD',   -- moneda en la que se consolida el patrimonio
  theme         text not null default 'dark',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- 2) MONEDAS  (una lista por usuario; multimoneda flexible)
--    `rate` = cuánto vale 1 unidad de ESTA moneda en la moneda base.
--    Ej. con base USD:  USD.rate = 1 ; ARS.rate = 0.001 (1 ARS = 0.001 USD)
--    La UI muestra esto de forma amigable ("1 USD = 1000 ARS").
-- ============================================================
create table if not exists public.currencies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  code        text not null,                 -- 'ARS', 'USD', 'BTC', ...
  name        text not null,
  symbol      text not null default '$',
  decimals    int  not null default 2,
  rate        numeric(24,10) not null default 1,  -- valor de 1 unidad en moneda base
  rate_updated_at timestamptz,
  sort        int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, code)
);

-- ============================================================
-- 3) CATEGORÍAS  (de gasto o de ingreso)
-- ============================================================
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  kind        text not null check (kind in ('expense','income')),
  icon        text not null default 'circle',  -- clave de ícono lucide
  color       text not null default 'cat-12',  -- token de color del diseño
  is_archived boolean not null default false,
  sort        int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 4) FUENTES DE INGRESO  (de dónde viene la plata)
-- ============================================================
create table if not exists public.income_sources (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null default 'cat-2',
  is_archived boolean not null default false,
  sort        int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 5) CUENTAS  (efectivo, banco, MP, USD, cripto…)
--    El saldo NO se guarda: se calcula como
--    initial_balance + suma de movimientos (ver vista al final).
-- ============================================================
create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  currency_code   text not null,
  type            text not null default 'cash'
                  check (type in ('cash','bank','wallet','crypto','investment','other')),
  initial_balance numeric(24,8) not null default 0,
  color           text not null default 'cat-1',
  icon            text not null default 'wallet',
  is_archived     boolean not null default false,
  sort            int  not null default 0,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- 6) TRANSACCIONES  (el corazón: gastos, ingresos, transferencias)
--    rate_to_base = cotización congelada al momento del movimiento,
--    para que los reportes históricos no se distorsionen con la inflación.
-- ============================================================
create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  type              text not null check (type in ('expense','income','transfer')),
  amount            numeric(24,8) not null check (amount >= 0),
  currency_code     text not null,
  rate_to_base      numeric(24,10) not null default 1,
  account_id        uuid references public.accounts(id) on delete set null,
  to_account_id     uuid references public.accounts(id) on delete set null, -- destino (transfer)
  to_amount         numeric(24,8),                                          -- monto en destino (transfer entre monedas)
  category_id       uuid references public.categories(id) on delete set null,
  income_source_id  uuid references public.income_sources(id) on delete set null,
  note              text,
  occurred_on       date not null default current_date,
  recurring_id      uuid,            -- si vino de un gasto fijo
  created_at        timestamptz not null default now()
);

-- ============================================================
-- 7) GASTOS / INGRESOS FIJOS  (reglas recurrentes)
-- ============================================================
create table if not exists public.recurring_rules (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  type              text not null check (type in ('expense','income')),
  amount            numeric(24,8) not null check (amount > 0),
  currency_code     text not null,
  account_id        uuid references public.accounts(id) on delete set null,
  category_id       uuid references public.categories(id) on delete set null,
  income_source_id  uuid references public.income_sources(id) on delete set null,
  note              text,
  frequency         text not null default 'monthly' check (frequency in ('monthly','weekly')),
  day_of_month      int check (day_of_month between 1 and 31),
  weekday           int check (weekday between 0 and 6),   -- 0=domingo
  next_run          date not null,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- 8) PRESUPUESTOS  (límite por categoría y por mes)
-- ============================================================
create table if not exists public.budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete cascade,
  month         date not null,                 -- primer día del mes (ej '2026-06-01')
  limit_amount  numeric(24,8) not null check (limit_amount >= 0),
  currency_code text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, category_id, month)
);

-- ============================================================
-- 9) METAS DE AHORRO
-- ============================================================
create table if not exists public.goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  target_amount  numeric(24,8) not null check (target_amount > 0),
  current_amount numeric(24,8) not null default 0,
  currency_code  text not null,
  target_date    date,
  color          text not null default 'cat-1',
  is_done        boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- 10) DEUDAS Y PRÉSTAMOS  (te deben / debés)
-- ============================================================
create table if not exists public.debts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('they_owe','i_owe')),  -- te deben / debés
  counterparty  text not null,
  amount        numeric(24,8) not null check (amount > 0),
  currency_code text not null,
  due_date      date,
  is_settled    boolean not null default false,
  note          text,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Índices para consultas frecuentes
-- ------------------------------------------------------------
create index if not exists idx_tx_user_date     on public.transactions(user_id, occurred_on desc);
create index if not exists idx_tx_account        on public.transactions(account_id);
create index if not exists idx_tx_category       on public.transactions(category_id);
create index if not exists idx_budgets_user_month on public.budgets(user_id, month);
create index if not exists idx_recurring_next     on public.recurring_rules(user_id, next_run) where is_active;

-- ------------------------------------------------------------
-- updated_at automático en profiles
-- ------------------------------------------------------------
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Activamos RLS y creamos una política "dueño" en cada tabla:
-- cada usuario solo puede leer/escribir SUS filas (auth.uid() = user_id).
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.currencies     enable row level security;
alter table public.categories     enable row level security;
alter table public.income_sources enable row level security;
alter table public.accounts       enable row level security;
alter table public.transactions   enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.budgets        enable row level security;
alter table public.goals          enable row level security;
alter table public.debts          enable row level security;

-- profiles usa `id` en vez de `user_id`
drop policy if exists "own_profile" on public.profiles;
create policy "own_profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Resto de tablas: misma política sobre `user_id`
do $$
declare t text;
begin
  foreach t in array array[
    'currencies','categories','income_sources','accounts',
    'transactions','recurring_rules','budgets','goals','debts'
  ]
  loop
    execute format('drop policy if exists "own_rows" on public.%I;', t);
    execute format(
      'create policy "own_rows" on public.%I for all
         using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;

-- ============================================================
-- ONBOARDING AUTOMÁTICO
-- Al crearse un usuario en auth.users, sembramos su mundo inicial.
-- security definer: corre con permisos del dueño para poder insertar.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Perfil (base USD por defecto)
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  -- Monedas iniciales: USD (base) y ARS
  insert into public.currencies (user_id, code, name, symbol, decimals, rate, sort) values
    (new.id, 'USD', 'Dólar',  'US$', 2, 1,     0),
    (new.id, 'ARS', 'Peso',   '$',   2, 0.001, 1);

  -- Categorías de GASTO
  insert into public.categories (user_id, name, kind, icon, color, sort) values
    (new.id, 'Comida',        'expense', 'utensils',        'cat-7',  0),
    (new.id, 'Supermercado',  'expense', 'shopping-cart',   'cat-9',  1),
    (new.id, 'Transporte',    'expense', 'bus',             'cat-2',  2),
    (new.id, 'Salidas',       'expense', 'beer',            'cat-5',  3),
    (new.id, 'Salud',         'expense', 'heart-pulse',     'cat-4',  4),
    (new.id, 'Hogar',         'expense', 'house',           'cat-6',  5),
    (new.id, 'Servicios',     'expense', 'plug',            'cat-10', 6),
    (new.id, 'Ropa',          'expense', 'shirt',           'cat-8',  7),
    (new.id, 'Educación',     'expense', 'graduation-cap',  'cat-3',  8),
    (new.id, 'Suscripciones', 'expense', 'repeat',          'cat-11', 9),
    (new.id, 'Regalos',       'expense', 'gift',            'cat-1',  10),
    (new.id, 'Otros',         'expense', 'ellipsis',        'cat-12', 11);

  -- Categorías de INGRESO
  insert into public.categories (user_id, name, kind, icon, color, sort) values
    (new.id, 'Sueldo',     'income', 'banknote',     'cat-1',  0),
    (new.id, 'Ventas',     'income', 'tag',          'cat-6',  1),
    (new.id, 'Freelance',  'income', 'laptop',       'cat-2',  2),
    (new.id, 'Reintegros', 'income', 'rotate-ccw',   'cat-3',  3),
    (new.id, 'Otros',      'income', 'ellipsis',     'cat-12', 4);

  -- Fuentes de ingreso (las tuyas)
  insert into public.income_sources (user_id, name, color, sort) values
    (new.id, 'Gobierno de la Ciudad', 'cat-2',  0),
    (new.id, 'Palacio Apple',         'cat-1',  1),
    (new.id, 'BrodhIA',               'cat-5',  2),
    (new.id, 'Otros',                 'cat-12', 3);

  -- Una cuenta inicial para arrancar
  insert into public.accounts (user_id, name, currency_code, type, icon, color, sort) values
    (new.id, 'Efectivo', 'ARS', 'cash', 'wallet', 'cat-1', 0);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- VISTA: saldos por cuenta
-- security_invoker = on  → respeta el RLS del usuario que consulta.
-- Suma todos los movimientos (gastos restan, ingresos suman,
-- transferencias mueven de una cuenta a otra).
-- ============================================================
create or replace view public.v_account_balances
with (security_invoker = on) as
with movimientos as (
  -- Efecto sobre la cuenta de origen
  select
    user_id,
    account_id,
    case type
      when 'income'   then amount
      when 'expense'  then -amount
      when 'transfer' then -amount
    end as delta
  from public.transactions
  where account_id is not null
  union all
  -- Efecto sobre la cuenta de destino (solo transferencias)
  select
    user_id,
    to_account_id as account_id,
    coalesce(to_amount, amount) as delta
  from public.transactions
  where type = 'transfer' and to_account_id is not null
)
select
  a.id   as account_id,
  a.user_id,
  a.initial_balance + coalesce(sum(m.delta), 0) as balance
from public.accounts a
left join movimientos m on m.account_id = a.id
group by a.id, a.user_id, a.initial_balance;

-- Listo. Tu base está creada y protegida. ✅
