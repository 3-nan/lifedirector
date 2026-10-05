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
| Langfristig (geplant) | Träume / Lebensziele | kein fester Rhythmus, über Jahre | optional (gleiche 4 Kategorien) | noch offen, siehe unten |

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

## Motivational Core (Phase 2, 2026-10-02)
Prinzip: Fortschritt sichtbar & emotional belohnend statt stummem Abhaken,
Fortschritt statt Perfektion (kein harter Streak-Reset), Identitäts-Framing
("du wirst zur Person, die...") statt reinem Lob.

- **Streak** (`computeStreak` in `lib/motivation.ts`): klassischer, strenger
  Consecutive-Days-Counter — nur für Meilenstein-Erkennung (3/7/30/100 Tage).
- **Momentum-Score** (`computeMomentum`): 0–100, steigt bei erledigtem Tag,
  sinkt bei verpasstem Tag langsamer als er steigt (60-Tage-Fenster) — das
  ist die "weiche" Zahl, die einen schlechten Tag nicht bestraft. Zeigt sich
  als kurzer Hinweistext (`momentumNote`) auf `Today`, wenn gerade kein
  Streak läuft, statt einfach nichts/0 anzuzeigen.
- **Celebration-Overlay** (`components/celebration.tsx`): Confetti-Partikel
  (reanimated, keine neue native Dependency) + Karte mit variiertem,
  identitäts-geframtem Satz, ausgelöst beim Überschreiten eines Meilensteins
  in `Today`.
- **Challenge-Abschluss** (2026-10-05): Antippen der aktiven Challenge auf
  `Today` löst das Celebration-Overlay mit größenabhängigem Satz aus
  (`challengeCompleteLine`); `Review` listet alle gemeisterten Challenges
  (gesamt + diesen Monat) aus `challenge_progress.completed_at`.
- **Tages-Encouragement** (`dailyEncouragement`): kurzer, pro Tag variierter
  Satz unter dem "Heute"-Header, abhängig vom Tagesfortschritt — kein
  generisches "Gut gemacht".
- **Push-Notification-Text** (`notificationCopy` + `lib/notifications.ts`):
  ermutigend statt mahnend, basiert auf der 7-Tage-Erledigungsquote. Wird bei
  jedem App-Start neu geplant (vorherige geplante Erinnerung wird vorher
  gecancelt — das war vorher ein Bug: es gab gar kein Cancel, hätte sich mit
  der Zeit dupliziert).
  **Grenze:** der Text wird nur beim nächsten App-Öffnen neu berechnet, nicht
  live zur Zustellzeit — lokale Notifications können das ohne Server nicht.

## Accounts / Multi-User (Basis live seit 2026-10-05)
Stand: anonyme Accounts + RLS laufen, alle drei Migrationen ausgeführt,
bisherige Daten erfolgreich auf den Account der neuen APK übertragen.
Offen: "Konto sichern" (siehe unten).

Ziel: andere Leute können die App mit eigenen Habits/Zielen/Challenges/
Träumen nutzen. Grundsatz: **so bequem wie möglich — kein Login-Zwang.**

- **Anonym zuerst:** beim ersten Start legt die App still einen anonymen
  Supabase-Account an (`ensureSession` in `lib/supabase.ts`, Gate in
  `app/_layout.tsx`). Kein Login-Screen, man startet sofort. Die Session
  bleibt auf dem Gerät gespeichert — "Login" passiert genau einmal, unsichtbar.
- **Konto sichern (nächster Schritt, noch offen):** später optional E-Mail
  verknüpfen (6-stelliger Code, kein Passwort) → gleiche `user_id`, alle
  Daten bleiben, dazu Sync auf ein zweites Gerät und Schutz vor Datenverlust
  bei Handywechsel/Neuinstallation. Sanft anstoßen statt erzwingen, z.B. nach
  der ersten Woche oder dem ersten Celebration-Moment.
  **Risiko ohne Sicherung:** App löschen = anonymer Account weg.
  **Offene Entscheidungen dazu:**
  1. *Wann anstoßen?* Vorschlag: nach 7 Tagen Nutzung oder dem ersten
     Streak-Meilenstein, als wegklickbare Karte auf `Today` (kein Popup,
     kein Zwang). Alternative: dauerhafter, dezenter Eintrag nur in einem
     Einstellungs-/Profil-Bereich.
  2. *Nur E-Mail-Code oder auch Google?* Vorschlag: erst nur E-Mail-Code
     (läuft ohne neue native Dependency). Google-Login braucht Google-Cloud-
     Konfiguration + nativen Build; auf iOS dann auch Sign in with Apple.
  3. *CAPTCHA gegen Missbrauch der anonymen Anmeldung?* Nicht dringend,
     solange nur Bekannte die APK haben — aber Pflicht vor einem
     Play-Store-Release.
  Bis das steht: Datenumzug auf einen neuen Account (neues Gerät/neuer
  Build) per `supabase/auth_3_move_data_to_new_account.sql`.
- **Datenbank:** `user_id` (Default `auth.uid()`) auf `habits`, `logs`,
  `tasks`, `monthly_goals`, `challenge_progress`; RLS "nur eigene Zeilen";
  `challenges`-Katalog bleibt geteilt. Migration in zwei Teilen:
  `supabase/auth_1_user_columns.sql` (additiv, alte App läuft weiter) und
  `supabase/auth_2_claim_and_lock.sql` (bisherige Daten dem ersten Account
  zuordnen, anon-Zugriff entfernen).
- Später: Google-Login als Alternative zum E-Mail-Code, CAPTCHA/Turnstile
  gegen Missbrauch der anonymen Anmeldung (Supabase-Empfehlung), eigener
  SMTP-Anbieter (Resend o.ä.) für die Code-Mails, Abmelden + "Account
  löschen" (Play-Store-Pflicht), Aufräumen alter ungesicherter Accounts.
- Neue Tabellen (z.B. `dreams`) bekommen `user_id` + RLS von Anfang an.

## Träume / Lebensziele (geplant, 2026-10-05)
Idee: eine "Bucket List" für Dinge, die man irgendwann im Leben machen will
— z.B. "Surfen lernen", "Reise nach Thailand", "Marathon laufen". Die App
soll diese Träume nicht nur sammeln, sondern aktiv dazu ermutigen, **den
ersten konkreten Schritt** zu gehen, statt sie ewig auf "irgendwann" zu
schieben.

Kernmechanik (Vorschlag, noch nicht entschieden):
- Traum anlegen: Titel, optional Kategorie (körperlich/kreativ/sozial/
  handwerklich) und ein "Warum ist mir das wichtig?"-Satz.
- **Nächster Schritt:** zu jedem Traum ein kleiner, konkreter erster Schritt
  ("Surfschulen in Portugal vergleichen", "Flugpreise BKK checken"). Der
  lässt sich mit einem Tipp als Wochen-Task (`tasks`) oder Monatsziel
  (`monthly_goals`) übernehmen — das wäre die bisher zurückgestellte
  `source_id`-Verknüpfung, jetzt mit echtem Anlass.
- **Ermutigung:** regelmäßig (z.B. in der Wochen-/Monatsplanung oder als
  Push) einen Traum hochholen, an dem lange nichts passiert ist, mit
  identitäts-geframtem Satz ("Du bist jemand, der Thailand nicht nur
  plant") statt Mahnung — gleiches Prinzip wie im Motivational Core.
- Fortschritt sichtbar: erledigte Schritte pro Traum, Traum als "erfüllt"
  markieren → Celebration-Overlay + Eintrag im `Review`.

Datenmodell-Skizze: `dreams` (id, title, category, why, status
open/in_progress/fulfilled, fulfilled_at, created_at) + Verknüpfung
`tasks.dream_id` / `monthly_goals.dream_id` für die Schritte.

Offene Fragen: eigener Tab oder Teil des `Challenges`-Hubs? Wie oft
ermutigen, ohne zu nerven? Schlägt die App selbst erste Schritte vor
(vorgefertigte Ideen pro Traum-Typ) oder nur der Nutzer? — Vor der
Umsetzung: erst HTML-Mockup, wie bei anderen größeren UI-Änderungen.

## Now
- Core-Habit-Tracking (`Today` / `Habits` / `Review`) — steht, läuft gegen Supabase.
- Challenges-Tab (`app/(tabs)/challenges.tsx`) — Code steht, Seed-Daten in
  `supabase/challenges.sql` (Tabellen in `supabase/schema.sql`).
- Wochen-Tasks (`Today`, Abschnitt "Diese Woche") + Monatsziele
  (`Challenges`, Abschnitt "Monatsziele") — Code steht, nach Mockup umgesetzt,
  Tabellen in Supabase angelegt.
- Habit-Frequenz (2026-10-05): jeder Habit hat ein Wochenziel
  (`habits.target_per_week`, 7 = täglich, 1–6 = x-mal pro ISO-Woche).
  1–6×-Habits haben Wochen-Streak/-Momentum, Celebration beim Erreichen des
  Wochenziels, zählen in `Today` nicht mehr als "fällig", wenn das Ziel schon
  steht, und `Review`/Push-Quote messen gegen das Ziel statt gegen 7/7.
  `supabase/habit_frequency.sql` ist ausgeführt (2026-10-05).
- Motivational Core (Streak/Momentum/Celebration/Encouragement) — Code steht,
  reiner JS/UI-Change, kein neuer Build nötig zum Testen.

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
  Einladungslink) — wird mit den Accounts möglich, braucht aber eigene
  Sharing-Regeln in RLS.
- Explizite "Exploration"-Komponente, die aktiv neue Habits/Challenges
  vorschlägt (aus Phase-2-Prinzipien übrig, noch nicht umgesetzt) — die
  Challenge-Ziehen-Mechanik deckt das fürs Monatliche schon ab, fürs
  Tägliche/Wöchentliche noch offen.
- Sound/Haptics beim Celebration-Moment (aktuell nur Animation + Text).

## Entscheidungen, die schon getroffen wurden
- ~~Kein Auth, kein Multi-User~~ → revidiert 2026-10-05: Multi-User mit
  anonymem Account zuerst und optionaler E-Mail-Sicherung, siehe "Accounts /
  Multi-User". "Mit Freund"-Markierung bei Challenges ist weiterhin nur ein
  Hinweis-Badge, keine geteilte Instanz.
- Challenges-Daten leben in Supabase (Tabellen `challenges` +
  `challenge_progress`), nicht hart im Code — konsistent zum
  Habits/Logs-Pattern.
- Drei-Zeithorizonte-Struktur (täglich/wöchentlich/monatlich) wie oben
  beschrieben, inkl. Kategorie-Kopplung der Wochen-Tasks und freier
  Monatsziele zusätzlich zur Challenge.
- Visuelles Design vorab als HTML-Mockup abgestimmt, dann 1:1 in React
  Native umgesetzt (2026-10-02) — bei größeren UI-Änderungen gleiches
  Vorgehen: erst Mockup, dann Code.
