-- "Alle meine Daten löschen" (Play-Store-Pflicht, siehe ROADMAP.md).
-- Löscht den eigenen Auth-Account; alle Tabellen mit user_id hängen per
-- `on delete cascade` daran, also verschwinden Habits, Logs, Tasks,
-- Monatsziele und Challenge-Fortschritt gleich mit.
-- `security definer`, weil normale Nutzer auth.users nicht anfassen dürfen —
-- die Funktion löscht aber ausschließlich die Zeile des Aufrufers.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
