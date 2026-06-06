-- ============================================================
-- PLATA — Migración 02: historial de aportes a metas de ahorro
-- Pegá y corré esto en el SQL Editor de Supabase (una sola vez).
-- Permite ver cuánto fuiste ahorrando por mes en cada meta.
-- ============================================================

create table if not exists public.goal_contributions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  goal_id     uuid not null references public.goals(id) on delete cascade,
  amount      numeric(24,8) not null,
  occurred_on date not null default current_date,
  created_at  timestamptz not null default now()
);

create index if not exists idx_goal_contrib on public.goal_contributions(user_id, goal_id, occurred_on desc);

alter table public.goal_contributions enable row level security;

drop policy if exists "own_rows" on public.goal_contributions;
create policy "own_rows" on public.goal_contributions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
