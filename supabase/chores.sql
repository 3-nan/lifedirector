-- Aufgaben (Alltag & Papierkram), siehe ROADMAP.md "Aufgaben".
-- Jede Aufgabe endet mit einer Entscheidung: erledigt, losgelassen oder ein
-- neuer, konkreter Zeitpunkt. Einmal im Supabase SQL-Editor ausführen.
begin;

create table if not exists public.chores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'open' check (status in ('open', 'done', 'let_go')),
  -- Fällig an einem Tag ODER in einer ISO-Woche ("2026-W43"); beides leer = Irgendwann.
  due_date date,
  due_week text,
  remind_at timestamptz,
  -- "nach dem Frühstück" aus "Fester Termin".
  plan_note text,
  -- Jede Verschiebung nach hinten; ab der dritten fragt die App nach.
  postponed_count integer not null default 0,
  -- Schritt aus "Kleiner machen" zeigt auf die große Aufgabe.
  parent_id uuid references public.chores(id) on delete set null,
  done_at timestamptz,
  let_go_at timestamptz,
  last_decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chores_one_due check (due_date is null or due_week is null)
);

create index if not exists chores_user_status_idx on public.chores (user_id, status);

alter table public.chores enable row level security;
grant select, insert, update on public.chores to authenticated;

drop policy if exists "Users manage own chores" on public.chores;
create policy "Users manage own chores"
  on public.chores for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

commit;
