# Roadmap

## Vision
Kein reiner Habit-Tracker, sondern eine Growth-App: tägliche Gewohnheiten
im Griff behalten *und* regelmäßig Impulse setzen, die aus der Komfortzone
holen (Challenges). Für den Eigenbedarf gebaut, keine Mehrbenutzer-App.

## Struktur: drei Zeithorizonte

| Horizont | Was | Rhythmus | Kategorisiert? | Lebt wo? |
|---|---|---|---|---|
| Täglich | Habits | wiederkehrend, binär | nein, freitext | `Today` / `Habits` |
| Wöchentlich | Tasks | einmalig pro Woche | ja, gleiche 4 Kategorien wie Challenges (körperlich/kreativ/sozial/handwerklich) | `Today` (neuer Abschnitt über den Habits) |
| Monatlich | Challenge (gezogen) **+** freie Monatsziele | einmalig pro Monat | Challenge ja, freie Ziele optional | `Challenges`-Tab |

Entscheidung (2026-10-01): Wochen-Tasks sind an die 4 Kategorien gekoppelt.
Monatsziele sind NICHT nur die gezogene Challenge — zusätzlich lassen sich
frei formulierte Monatsziele eintragen (z.B. "Umzug organisieren"), beides
lebt im `Challenges`-Tab, der damit zum "Monats-Hub" wird.

Optionale spätere Verknüpfung (nicht für v1): ein Wochen-Task kann auf eine
Challenge/ein Monatsziel zeigen (`source_id`), um große Ziele in Wochen-
Schritte runterzubrechen. Erstmal weglassen, bis sich zeigt, ob's gebraucht
wird.

### Datenmodell
- `tasks`: id, title, category, week_key (ISO-Woche, z.B. "2026-W40"), done,
  completed_at, created_at — eigene Zeilen pro Woche statt dauerhafter Katalog
  wie bei `challenges`.
- `monthly_goals`: id, title, month_key (z.B. "2026-10"), done, completed_at,
  created_at — freie Ziele, unabhängig von `challenges`.

Beide umgesetzt in `supabase/tasks_and_goals.sql`, Typen in `types/task.ts` /
`types/monthlyGoal.ts`, Perioden-Helper (`isoWeekKey`, `monthKey`) in
`lib/period.ts`.

## Now
- Core-Habit-Tracking (`Today` / `Habits` / `Review`) — steht, läuft gegen Supabase.
- Challenges-Tab (`app/(tabs)/challenges.tsx`) — Code steht, Seed-Daten in
  `supabase/challenges.sql` (Tabellen in `supabase/schema.sql`).
- Wochen-Tasks (`Today`, Abschnitt "Diese Woche") + Monatsziele
  (`Challenges`, Abschnitt "Monatsziele") — Code steht, nach Mockup umgesetzt.
  **Offen: `supabase/tasks_and_goals.sql` einmal im Supabase SQL-Editor
  ausführen** (nach `schema.sql`), sonst bleiben beide Abschnitte leer.

## Next
- Nach dem Ausführen aller drei SQL-Dateien: eine Woche dogfooden, Reibung
  notieren (z.B. nervt der Alert beim Ziehen/bei der Kategorie-Wahl? Fehlt
  eine Übersicht über erledigte Items über Zeit?).
- Monats-Review: erledigte Challenges/Monatsziele + Wochen-Tasks-Quote in
  `Review` mit aufnehmen — Daten existieren jetzt, Review-UI zieht noch nicht
  nach.
- Styling-Konstanten (`ACCENT`, `CARD_BG`, `MUTED`, …) aus den einzelnen
  Screens in `constants/theme.ts` zentralisieren statt sie mehrfach zu
  duplizieren — Voraussetzung für konsistentes Look-and-Feel, bevor mehr
  Screens dazukommen.
- Gezogene Challenge als eigene Karte/State statt `Alert.alert` — v.a.
  relevant, falls die Challenge länger "aktiv" bleibt (ongoing-Kategorie)
  und man sie wiederfinden will, ohne erneut zu ziehen.

## Later / Ideen (ungeprüft)
- Wochen-Tasks optional mit Challenge/Monatsziel verknüpfen (Hierarchie
  Monat → Woche → Tag), siehe oben — erst wenn sich der Bedarf zeigt.
- Erinnerungen für aktive Challenges/offene Wochen-Tasks (analog
  `lib/notifications.ts`).
- Freund-als-Co-Pilot als echtes Feature (gemeinsame Challenge-Instanz,
  Einladungslink) — braucht Auth, aktuell bewusst zurückgestellt.
- Streaks/Gamification fürs Habit-Tracking.

## Entscheidungen, die schon getroffen wurden
- Kein Auth, kein Multi-User — anon Supabase-Key, ein Nutzer (siehe
  `lib/supabase.ts`). "Mit Freund"-Markierung bei Challenges ist aktuell
  nur ein Hinweis-Badge, keine geteilte Instanz.
- Challenges-Daten leben in Supabase (Tabellen `challenges` +
  `challenge_progress`), nicht hart im Code — konsistent zum
  Habits/Logs-Pattern.
- Drei-Zeithorizonte-Struktur (täglich/wöchentlich/monatlich) wie oben
  beschrieben, inkl. Kategorie-Kopplung der Wochen-Tasks und freier
  Monatsziele zusätzlich zur Challenge.
- Visuelles Design vorab als HTML-Mockup abgestimmt, dann 1:1 in React
  Native umgesetzt (2026-10-02) — bei größeren UI-Änderungen gleiches
  Vorgehen: erst Mockup, dann Code.
