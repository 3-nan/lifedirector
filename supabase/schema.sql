-- Bootstrap schema for a fresh Supabase project.
-- IMPORTANT: The app currently uses the anon key without signing users in.
-- These policies make the prototype work, but expose shared data to anyone
-- with the app's public anon key. Do not use this access model for production.

begin;

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  icon text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  constraint logs_habit_id_date_key unique (habit_id, date)
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  description text,
  category text not null check (category in ('koerperlich', 'kreativ', 'sozial', 'handwerklich')),
  size text not null check (size in ('micro', 'afternoon', 'ongoing', 'bold')),
  friend_friendly boolean not null default false,
  active boolean not null default true,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_progress (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null unique references public.challenges(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'active', 'done')),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists habits_active_sort_order_idx
  on public.habits (active, sort_order);
create index if not exists logs_date_idx
  on public.logs (date);
create index if not exists challenges_active_created_at_idx
  on public.challenges (active, created_at);

alter table public.habits enable row level security;
alter table public.logs enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_progress enable row level security;

grant usage on schema public to anon;
grant select, insert, update on public.habits to anon;
grant select, insert, update on public.logs to anon;
grant select on public.challenges to anon;
grant select, insert, update on public.challenge_progress to anon;

drop policy if exists "Prototype anon can read habits" on public.habits;
create policy "Prototype anon can read habits"
  on public.habits for select to anon using (true);
drop policy if exists "Prototype anon can insert habits" on public.habits;
create policy "Prototype anon can insert habits"
  on public.habits for insert to anon with check (true);
drop policy if exists "Prototype anon can update habits" on public.habits;
create policy "Prototype anon can update habits"
  on public.habits for update to anon using (true) with check (true);

drop policy if exists "Prototype anon can read logs" on public.logs;
create policy "Prototype anon can read logs"
  on public.logs for select to anon using (true);
drop policy if exists "Prototype anon can insert logs" on public.logs;
create policy "Prototype anon can insert logs"
  on public.logs for insert to anon with check (true);
drop policy if exists "Prototype anon can update logs" on public.logs;
create policy "Prototype anon can update logs"
  on public.logs for update to anon using (true) with check (true);

drop policy if exists "Prototype anon can read challenges" on public.challenges;
create policy "Prototype anon can read challenges"
  on public.challenges for select to anon using (true);

drop policy if exists "Prototype anon can read challenge progress" on public.challenge_progress;
create policy "Prototype anon can read challenge progress"
  on public.challenge_progress for select to anon using (true);
drop policy if exists "Prototype anon can insert challenge progress" on public.challenge_progress;
create policy "Prototype anon can insert challenge progress"
  on public.challenge_progress for insert to anon with check (true);
drop policy if exists "Prototype anon can update challenge progress" on public.challenge_progress;
create policy "Prototype anon can update challenge progress"
  on public.challenge_progress for update to anon using (true) with check (true);

commit;