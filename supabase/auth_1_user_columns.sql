-- Multi-User, Teil 1 (siehe ROADMAP.md, "Accounts / Multi-User").
-- Fügt jeder persönlichen Tabelle einen Besitzer (`user_id`) hinzu und legt
-- die neuen "nur eigene Zeilen"-Regeln für eingeloggte Nutzer an.
-- Die alten anon-Regeln bleiben vorerst bestehen, damit die installierte
-- App bis zum neuen Build weiterläuft — die fallen erst in Teil 2 weg.

begin;

alter table public.habits
  add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.logs
  add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.tasks
  add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.monthly_goals
  add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.challenge_progress
  add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

create index if not exists habits_user_id_idx on public.habits (user_id);
create index if not exists logs_user_id_date_idx on public.logs (user_id, date);
create index if not exists tasks_user_id_week_key_idx on public.tasks (user_id, week_key);
create index if not exists monthly_goals_user_id_month_key_idx on public.monthly_goals (user_id, month_key);

-- Fortschritt pro Nutzer und Challenge statt nur pro Challenge. Der alte
-- Unique-Key auf challenge_id fällt erst in Teil 2 weg (die alte App braucht ihn).
alter table public.challenge_progress
  drop constraint if exists challenge_progress_user_challenge_key;
alter table public.challenge_progress
  add constraint challenge_progress_user_challenge_key unique (user_id, challenge_id);

grant usage on schema public to authenticated;
grant select, insert, update on public.habits to authenticated;
grant select, insert, update on public.logs to authenticated;
grant select, insert, update on public.tasks to authenticated;
grant select, insert, update on public.monthly_goals to authenticated;
grant select, insert, update on public.challenge_progress to authenticated;
grant select on public.challenges to authenticated;

-- Eingeloggte (auch anonyme) Nutzer sehen und ändern nur ihre eigenen Zeilen.
drop policy if exists "Users manage own habits" on public.habits;
create policy "Users manage own habits"
  on public.habits for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users manage own logs" on public.logs;
create policy "Users manage own logs"
  on public.logs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );

drop policy if exists "Users manage own tasks" on public.tasks;
create policy "Users manage own tasks"
  on public.tasks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users manage own monthly goals" on public.monthly_goals;
create policy "Users manage own monthly goals"
  on public.monthly_goals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users manage own challenge progress" on public.challenge_progress;
create policy "Users manage own challenge progress"
  on public.challenge_progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Der Challenge-Katalog ist für alle gleich.
drop policy if exists "Users can read challenges" on public.challenges;
create policy "Users can read challenges"
  on public.challenges for select to authenticated using (true);

commit;
