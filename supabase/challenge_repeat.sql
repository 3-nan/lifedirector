-- Challenges mehrfach machen: eine Zeile pro Durchgang statt pro Challenge.
-- 'active' = läuft gerade, 'done' = geschafft (completed_at), 'open' = abgebrochen.
-- Einmal im Supabase SQL-Editor ausführen (nach auth_2_claim_and_lock.sql),
-- zusammen mit dem App-Update — die alte App braucht den Unique-Key.
begin;

alter table public.challenge_progress
  drop constraint if exists challenge_progress_user_challenge_key;

-- Zurückgesetzte Zeilen tragen keine Information mehr.
delete from public.challenge_progress where status = 'open';

-- Pro Nutzer und Challenge läuft höchstens ein Durchgang gleichzeitig.
create unique index if not exists challenge_progress_one_active_idx
  on public.challenge_progress (user_id, challenge_id) where status = 'active';
create index if not exists challenge_progress_user_challenge_idx
  on public.challenge_progress (user_id, challenge_id);

commit;
