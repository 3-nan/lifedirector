-- Automatische Traum-Fotos (siehe ROADMAP.md, "Fotos (automatisch)").
-- Einmalig im Supabase SQL-Editor ausführen (nach dreams.sql).
-- Rein additiv: neue Spalten auf `dreams` + Zähler für das Tageslimit.

begin;

alter table public.dreams
  add column if not exists image_url text,
  add column if not exists image_credit text,         -- Name des Fotografen
  add column if not exists image_credit_url text,     -- Link zum Foto/Profil (Pflicht bei Unsplash/Pexels)
  add column if not exists image_source text
    check (image_source in ('unsplash', 'pexels')),
  add column if not exists image_queries text[],      -- Suchbegriffe aus KI-Aufruf #1, konkret → allgemein
  add column if not exists image_candidates jsonb,    -- Kandidaten in KI-Reihenfolge, für "Anderes Bild"
  add column if not exists image_index int not null default 0;  -- aktuell gezeigter Kandidat

-- Ein Eintrag pro Bild-Aufruf mit KI. Nutzer können ihre Zeilen lesen, aber
-- weder anlegen noch löschen — gezählt wird nur über claim_image_call().
create table if not exists public.image_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  dream_id uuid references public.dreams(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists image_calls_user_day_idx on public.image_calls (user_id, created_at);

alter table public.image_calls enable row level security;
grant select on public.image_calls to authenticated;

drop policy if exists "Users read own image calls" on public.image_calls;
create policy "Users read own image calls"
  on public.image_calls for select to authenticated
  using (user_id = (select auth.uid()));

-- Bucht einen Bild-Aufruf für den angemeldeten Nutzer, falls heute
-- (Kalendertag Europe/Berlin) noch keine 4 verbraucht sind. Gibt true zurück,
-- wenn der Aufruf erlaubt ist. Advisory-Lock pro Nutzer, damit parallele
-- Aufrufe das Limit nicht überholen.
create or replace function public.claim_image_call(p_dream_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  day_start timestamptz := date_trunc('day', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin';
  used int;
begin
  if uid is null then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext('image_calls:' || uid::text));

  select count(*) into used
    from public.image_calls
    where user_id = uid and created_at >= day_start;

  if used >= 4 then
    return false;
  end if;

  insert into public.image_calls (user_id, dream_id) values (uid, p_dream_id);
  return true;
end;
$$;

revoke all on function public.claim_image_call(uuid) from public, anon;
grant execute on function public.claim_image_call(uuid) to authenticated;

commit;
