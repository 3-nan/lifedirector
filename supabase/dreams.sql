-- Träume / Lebensziele (siehe ROADMAP.md, "Träume / Lebensziele").
-- Einmalig im Supabase SQL-Editor ausführen (nach auth_1/auth_2).
-- Rein additiv: neue Tabellen + eine optionale Spalte auf `tasks`.

begin;

create table if not exists public.dreams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  emoji text not null default '✨',
  color text not null default 'blue',
  horizon text not null default 'someday'
    check (horizon in ('this_year', '1_3_years', '5_plus', 'someday')),
  target_label text,          -- optionales "Bis …", frei formuliert ("Sommer 2027", "vor meinem 40.")
  why text,                   -- Warum ist mir das wichtig?
  feeling text,               -- Wie wird es sich anfühlen?
  obstacle text,              -- Was hält mich bisher ab?
  next_step text,             -- genau ein kleiner nächster Schritt
  stage text not null default 'dream'
    check (stage in ('dream', 'explored', 'planned', 'committed', 'fulfilled', 'let_go')),
  last_activity_at timestamptz not null default now(),  -- Basis für "Traum der Woche"
  fulfilled_at timestamptz,
  fulfilled_note text,        -- "Wie war's?" für die Erinnerungswand
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dream_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dream_id uuid not null references public.dreams(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  task_id uuid references public.tasks(id) on delete set null,  -- falls als Wochen-Task übernommen
  done_at timestamptz,
  created_at timestamptz not null default now()
);

-- Wochen-Tasks können zu einem Traum gehören. Solche Tasks brauchen keine
-- der vier Challenge-Kategorien (sie zeigen stattdessen den Traum an).
alter table public.tasks
  add column if not exists dream_id uuid references public.dreams(id) on delete set null;
alter table public.tasks alter column category drop not null;

create index if not exists dreams_user_id_idx on public.dreams (user_id);
create index if not exists dream_steps_dream_id_idx on public.dream_steps (dream_id);
create index if not exists dream_steps_task_id_idx on public.dream_steps (task_id);

alter table public.dreams enable row level security;
alter table public.dream_steps enable row level security;

grant select, insert, update, delete on public.dreams to authenticated;
grant select, insert, update, delete on public.dream_steps to authenticated;

drop policy if exists "Users manage own dreams" on public.dreams;
create policy "Users manage own dreams"
  on public.dreams for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users manage own dream steps" on public.dream_steps;
create policy "Users manage own dream steps"
  on public.dream_steps for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.dreams d where d.id = dream_id and d.user_id = (select auth.uid()))
  );

-- Wird ein Wochen-Task abgehakt, der aus einem Traum-Schritt entstanden ist,
-- gilt der Schritt als erledigt (und umgekehrt beim Zurücknehmen) — egal, in
-- welchem Screen abgehakt wurde. Läuft mit den Rechten des Aufrufers, RLS greift.
create or replace function public.sync_dream_step_from_task()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.done is distinct from old.done then
    update public.dream_steps
      set done_at = case when new.done then coalesce(new.completed_at, now()) else null end
      where task_id = new.id;
    if new.dream_id is not null then
      update public.dreams set last_activity_at = now(), updated_at = now() where id = new.dream_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_sync_dream_step on public.tasks;
create trigger tasks_sync_dream_step
  after update of done on public.tasks
  for each row execute function public.sync_dream_step_from_task();

commit;
