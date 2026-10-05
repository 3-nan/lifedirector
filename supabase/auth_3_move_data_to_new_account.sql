-- Behelf, solange es noch kein "Konto sichern" (E-Mail-Login) gibt: alle
-- Daten vom bisherigen Account auf den NEUESTEN Account übertragen — z.B.
-- nach Neuinstallation/neuem Build, wenn die App mit leerem Account startet.
-- Vorher die neue App einmal öffnen (dabei entsteht der neue Account).

begin;

do $$
declare
  -- Normalerweise leer lassen (automatische Wahl). Sonst IDs aus
  -- `select id, created_at from auth.users order by created_at;` eintragen.
  manual_from uuid := null;
  manual_to uuid := null;
  from_user uuid;
  to_user uuid;
  owner_count integer;
begin
  to_user := coalesce(manual_to, (select id from auth.users order by created_at desc limit 1));

  if manual_from is not null then
    from_user := manual_from;
  else
    select count(distinct user_id) into owner_count from public.habits where user_id <> to_user;
    if owner_count = 0 then
      raise exception 'Kein anderer Account mit Habits gefunden — nichts zu übertragen.';
    elsif owner_count > 1 then
      raise exception 'Mehrere Accounts mit Habits (%) — oben manual_from eintragen.', owner_count;
    end if;
    select distinct user_id into from_user from public.habits where user_id <> to_user;
  end if;

  if from_user = to_user then
    raise exception 'Quelle und Ziel sind derselbe Account.';
  end if;

  -- Fortschritt, den der neue Account evtl. schon angelegt hat, weicht dem
  -- übertragenen (sonst kollidiert der Unique-Key user_id + challenge_id).
  delete from public.challenge_progress
    where user_id = to_user
      and challenge_id in (select challenge_id from public.challenge_progress where user_id = from_user);

  update public.habits set user_id = to_user where user_id = from_user;
  update public.logs set user_id = to_user where user_id = from_user;
  update public.tasks set user_id = to_user where user_id = from_user;
  update public.monthly_goals set user_id = to_user where user_id = from_user;
  update public.challenge_progress set user_id = to_user where user_id = from_user;

  raise notice 'Daten von % nach % übertragen.', from_user, to_user;
end $$;

commit;
