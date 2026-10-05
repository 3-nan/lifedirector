-- Multi-User, Teil 2: bisherige Daten deinem Account zuordnen und den
-- offenen anon-Zugriff schließen. Erst ausführen, NACHDEM die neue App
-- einmal geöffnet wurde (dabei entsteht dein Account). Danach funktioniert
-- die alte installierte APK nicht mehr — neuen Build installieren.

begin;

do $$
declare
  -- Normalerweise leer lassen. Nur falls schon mehrere Accounts existieren:
  -- deine ID aus `select id, created_at from auth.users;` hier eintragen,
  -- z.B. '00000000-0000-0000-0000-000000000000'::uuid
  manual_owner uuid := null;
  owner uuid;
  user_count integer;
begin
  select count(*) into user_count from auth.users;
  if manual_owner is not null then
    owner := manual_owner;
  elsif user_count = 0 then
    raise exception 'Noch kein Account vorhanden — erst die neue App einmal öffnen.';
  elsif user_count > 1 then
    raise exception 'Mehr als ein Account vorhanden (%) — oben manual_owner eintragen.', user_count;
  else
    select id into owner from auth.users limit 1;
  end if;

  update public.habits set user_id = owner where user_id is null;
  update public.logs set user_id = owner where user_id is null;
  update public.tasks set user_id = owner where user_id is null;
  update public.monthly_goals set user_id = owner where user_id is null;
  update public.challenge_progress set user_id = owner where user_id is null;
end $$;

alter table public.habits alter column user_id set not null;
alter table public.logs alter column user_id set not null;
alter table public.tasks alter column user_id set not null;
alter table public.monthly_goals alter column user_id set not null;
alter table public.challenge_progress alter column user_id set not null;

alter table public.challenge_progress drop constraint if exists challenge_progress_challenge_id_key;

-- Prototyp-Zugriff ohne Login entfernen.
drop policy if exists "Prototype anon can read habits" on public.habits;
drop policy if exists "Prototype anon can insert habits" on public.habits;
drop policy if exists "Prototype anon can update habits" on public.habits;
drop policy if exists "Prototype anon can read logs" on public.logs;
drop policy if exists "Prototype anon can insert logs" on public.logs;
drop policy if exists "Prototype anon can update logs" on public.logs;
drop policy if exists "Prototype anon can read challenges" on public.challenges;
drop policy if exists "Prototype anon can read challenge progress" on public.challenge_progress;
drop policy if exists "Prototype anon can insert challenge progress" on public.challenge_progress;
drop policy if exists "Prototype anon can update challenge progress" on public.challenge_progress;
drop policy if exists "Prototype anon can read tasks" on public.tasks;
drop policy if exists "Prototype anon can insert tasks" on public.tasks;
drop policy if exists "Prototype anon can update tasks" on public.tasks;
drop policy if exists "Prototype anon can read monthly goals" on public.monthly_goals;
drop policy if exists "Prototype anon can insert monthly goals" on public.monthly_goals;
drop policy if exists "Prototype anon can update monthly goals" on public.monthly_goals;

revoke all on public.habits, public.logs, public.tasks, public.monthly_goals,
  public.challenge_progress, public.challenges from anon;

commit;
