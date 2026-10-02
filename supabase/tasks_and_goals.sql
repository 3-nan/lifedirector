-- Migration: Wochen-Tasks + Monatsziele (siehe ROADMAP.md, "Struktur: drei
-- Zeithorizonte"). Nach supabase/schema.sql einmalig im SQL-Editor ausführen.

begin;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  category text not null check (category in ('koerperlich', 'kreativ', 'sozial', 'handwerklich')),
  week_key text not null,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.monthly_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  month_key text not null,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tasks_week_key_idx
  on public.tasks (week_key);
create index if not exists monthly_goals_month_key_idx
  on public.monthly_goals (month_key);

alter table public.tasks enable row level security;
alter table public.monthly_goals enable row level security;

grant usage on schema public to anon;
grant select, insert, update on public.tasks to anon;
grant select, insert, update on public.monthly_goals to anon;

drop policy if exists "Prototype anon can read tasks" on public.tasks;
create policy "Prototype anon can read tasks"
  on public.tasks for select to anon using (true);
drop policy if exists "Prototype anon can insert tasks" on public.tasks;
create policy "Prototype anon can insert tasks"
  on public.tasks for insert to anon with check (true);
drop policy if exists "Prototype anon can update tasks" on public.tasks;
create policy "Prototype anon can update tasks"
  on public.tasks for update to anon using (true) with check (true);

drop policy if exists "Prototype anon can read monthly goals" on public.monthly_goals;
create policy "Prototype anon can read monthly goals"
  on public.monthly_goals for select to anon using (true);
drop policy if exists "Prototype anon can insert monthly goals" on public.monthly_goals;
create policy "Prototype anon can insert monthly goals"
  on public.monthly_goals for insert to anon with check (true);
drop policy if exists "Prototype anon can update monthly goals" on public.monthly_goals;
create policy "Prototype anon can update monthly goals"
  on public.monthly_goals for update to anon using (true) with check (true);

commit;
