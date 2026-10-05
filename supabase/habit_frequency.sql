-- Wochenziel pro Habit: 7 = täglich, 1–6 = so oft pro Woche (ISO-Woche, Mo–So).
-- Einmal im Supabase SQL-Editor ausführen (nach schema.sql).
alter table public.habits
  add column if not exists target_per_week integer not null default 7
  check (target_per_week between 1 and 7);
