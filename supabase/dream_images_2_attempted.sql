-- Automatische Traum-Fotos, Teil 2: pro Traum merken, ob schon einmal ein
-- Foto gesucht wurde. Die App holt beim Start nur für Träume ohne Versuch
-- ein Foto nach — so läuft das für jeden Traum genau einmal.
-- Einmalig im Supabase SQL-Editor ausführen (nach dream_images.sql).

begin;

alter table public.dreams
  add column if not exists image_attempted boolean not null default false;

-- Träume, die schon ein Foto haben, gelten als erledigt.
update public.dreams set image_attempted = true where image_url is not null;

commit;
