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
  **Umgesetzt (2026-10-05, Branch `konto-sichern`), nach Mockup:**
  Zahnrad oben rechts auf `Today` → `app/settings.tsx` (eigener Screen, kein
  Tab) mit Konto-Status, "Mit E-Mail sichern" (6-stelliger Code, kein
  Passwort), "Schon gesichert? Hier anmelden" (ersetzt ungesicherte Daten
  auf dem Gerät, mit Warnung vorher), "Abmelden" und "Alle meine Daten
  löschen" (Bestätigung durch Eintippen von LÖSCHEN, RPC `delete_my_account`
  in `supabase/delete_account.sql`). Hinweis-Karte auf `Today` nach 7 Tagen
  für ungesicherte Accounts, "Später" blendet sie dauerhaft aus. Logik in
  `lib/account.ts`.
  Entschieden: nur E-Mail-Code (kein Google vorerst); CAPTCHA vor dem
  geschlossenen Play-Test; beim Anmelden ersetzen statt zusammenführen.
  Voraussetzung in Supabase: Mail-Vorlagen "Magic Link" und "Change Email
  Address" mit `{{ .Token }}`; Email-OTP-Länge auf **6** (die App erwartet
  6 Ziffern, Supabase-Default war 8); SMTP aktuell über Gmail
  (App-Passwort) — vor einem Release besser Resend mit eigener Domain.
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

## Play-Store-Release (geplant, 2026-10-05)
Ziel: LifeDirector öffentlich im Google Play Store. Größter Zeitfaktor ist
der Pflicht-Testlauf für neue private Entwicklerkonten — deshalb früh
anfangen und parallel an der App arbeiten.

**1. Entwicklerkonto** (zuerst, läuft im Hintergrund)
- Google Play Console: 25 $ einmalig + Identitätsprüfung (dauert Tage).
- Neue private Konten: geschlossener Test mit mind. 12 Testern, 14 Tage am
  Stück, bevor Produktionszugang beantragt werden kann (Zahlen in der
  Console gegenprüfen, Google ändert das gelegentlich). Tester früh suchen.

**2. App-Voraussetzungen**
- [x] Package-Name festgelegt (2026-10-06): `com.lifedirector.app` (Android
      + iOS-Bundle-ID, Scheme `lifedirector`) — neutral statt Klarname, weil
      der Package-Name öffentlich im Play-Store-Link steht. Vorher
      `com.franzmotzkus.habittracker`; neue App auf dem Handy → einmal mit
      E-Mail anmelden, alte App deinstallieren. Für volle Neutralität beim
      Release zusätzlich: eigene App-E-Mail (Support-Kontakt + SMTP-Absender)
      und "LifeDirector" als Entwicklername in Play.
- [ ] "Account/Daten löschen": in der App erledigt (Einstellungen); fehlt
      noch die Web-Seite für Löschanfragen (Play-Pflicht).
- [ ] CAPTCHA (Cloudflare Turnstile) für die anonyme Anmeldung in Supabase.
- [x] "Konto sichern" (siehe Accounts) — Code steht, Branch `konto-sichern`.
- [ ] Supabase-Plan prüfen: Free-Projekte pausieren nach 7 Tagen Inaktivität,
      nur einfache Backups → mit echten Nutzern Pro (~25 $/Monat) erwägen.

**3. Build & Upload**
- `npx eas-cli build --platform android --profile production` → AAB statt
  APK (`autoIncrement` für versionCode steht schon in `eas.json`).
- Ersten Build manuell in der Play Console hochladen; danach
  `npx eas-cli submit --platform android` (braucht einmalig einen Google-
  Service-Account-Key). Signing: Play App Signing, EAS-Key bleibt Upload-Key.

**4. Store-Eintrag & Formulare**
- [ ] Texte: Name, Kurzbeschreibung (≤ 80 Zeichen), Beschreibung (≤ 4000);
      Deutsch zuerst, Englisch später.
- [ ] Grafiken: Icon 512×512, Feature-Grafik 1024×500, ≥ 2 Handy-Screenshots
      (echte Screenshots, `docs/mockup.png` als Stil-Vorlage).
- [ ] Datenschutzerklärung (öffentliche URL, DSGVO): was in Supabase
      gespeichert wird, Region des Projekts, wie man löscht.
- [ ] Formulare: Datensicherheit, Altersfreigabe, Zielgruppe, Werbung
      (keine), App-Zugriff (kein Login nötig).

**5. Release-Weg**
Interner Test (nur ich) → geschlossener Test (≥ 12 Tester, 14 Tage) →
Produktionszugang beantragen → Review (meist wenige Tage) → live.

**Reihenfolge:** Konto jetzt eröffnen → parallel App-Voraussetzungen
(Löschen, CAPTCHA, idealerweise Konto sichern, Package-Name) →
Datenschutz/Texte/Screenshots → Production-Build + interner Test →
geschlossener Test starten → nach 14 Tagen Produktion beantragen.

## Träume / Lebensziele (geplant, Konzept 2026-10-06)
Idee: eine Mischung aus Vision Board und Bucket List für Dinge, die man im
Leben noch machen will ("Surfen lernen", "Reise nach Thailand", "Marathon").
Die App soll Träume nicht nur sammeln, sondern **präsent halten** und zum
**nächsten kleinen Schritt** schubsen, statt sie auf "irgendwann" zu schieben.

> Status: **Beschreibung dessen, was gebaut werden soll — keine fixe
> Entscheidung.** Vor der Umsetzung: HTML-Mockup, dann nochmal abstimmen.

**Schon entschieden (2026-10-06):**
- Eigener Tab "Träume" (nicht im `Challenges`-Hub) — emotional etwas anderes
  als Challenges, und ein Tab hält sie präsent.
- Keine Begrenzung der Anzahl Träume. Gegen Überforderung hilft stattdessen
  der wöchentliche Fokus auf *einen* Traum (siehe "Traum der Woche").
- Fotos nicht in v1, aber als spätere Erweiterung vorgesehen.

**Psychologischer Grundsatz:** Reines Schwärmen (Vision Board nur anschauen)
senkt laut Forschung (Oettingen, "WOOP"/Mental Contrasting) eher die
Handlungsenergie. Wirksamer: Traum lebendig vorstellen → ehrlich das
Hindernis benennen → konkreten nächsten Schritt festlegen, ideal als
Wenn-dann-Plan. Die App verbindet deshalb das Emotionale eines Vision Boards
mit dem Konkreten eines Plans.

### Darstellung
- **Board statt Liste:** jeder Traum als Karte (v1: großes Emoji + Farbe,
  Titel, Horizont, Stufe; später: eigenes Foto). Gruppiert nach Horizont:
  *Dieses Jahr* / *In 1–3 Jahren* / *5+ Jahre* / *Irgendwann*.
- **"Erfüllt"-Bereich als Erinnerungswand:** erfüllte Träume mit kurzer
  Notiz ("Wie war's?") — motiviert mehr als jede offene Liste.
- **Stufen statt nur offen/erledigt:** Traum → Erkundet → Geplant → Fest
  zugesagt → Erfüllt (plus "Losgelassen"). Fortschritt wird sichtbar, lange
  bevor ein Traum erfüllt ist.
- **Detailansicht:** Warum ist mir das wichtig? · Wie wird es sich anfühlen
  (ein lebendiger Satz)? · Was hält mich bisher ab (Hindernis)? · nächster
  Schritt · bisherige Schritte.

### Zeitkomponente
- **Weiche Horizonte statt harter Deadlines** — eine verpasste Deadline bei
  einem Traum erzeugt Schuldgefühl. Optional ein konkretes "Bis …" (z.B.
  "vor meinem 40." oder "Sommer 2027").
- **Beste Zeit / Saison** (später): z.B. Thailand Nov–Feb → rechtzeitig ein
  Hinweis "Wenn du im Februar fliegen willst, wäre jetzt die Zeit, Flüge
  anzuschauen".
- **Jährlicher Traum-Review** (später, z.B. Januar oder Geburtstag):
  Horizonte neu sortieren, Träume nach vorne holen — und Träume bewusst
  loslassen dürfen. "Losgelassen" ist ein legitimer Abschluss, kein Scheitern.

### Wie die App zum nächsten Schritt schubst
1. **Jeder aktive Traum hat genau einen nächsten Schritt** — klein (≤ 30 Min).
   "Surfcamps in Portugal vergleichen" statt "Surfen lernen".
2. **Schritt-Vorschläge nach Stufe** (später auch aus einer Ideen-
   Bibliothek): *Erkunden* (recherchieren, mit jemandem reden, der es schon
   gemacht hat) → *Planen* (Budget, Zeitraum, Ausrüstung) → *Fest zusagen*
   (buchen, anmelden, anzahlen — der stärkste Hebel).
3. **Ein Tipp: Schritt als Wochen-Task übernehmen** → landet in `Today`
   unter "Diese Woche" (verknüpft über `tasks.dream_id`).
4. **"Traum der Woche" auf `Today`:** einmal pro Woche holt die App einen
   Traum nach vorne — den, an dem am längsten nichts passiert ist, oder
   dessen Horizont/Saison näher rückt — mit der Frage "Was ist dein nächster
   kleiner Schritt?". Ersetzt die (bewusst weggelassene) Begrenzung.
5. **Schritte feiern, nicht nur das Ziel:** kleine Celebration bei
   erledigtem Schritt, größere bei Stufenwechsel, volle bei "Erfüllt".
6. **Verknüpfung mit Fokus-Wochen:** z.B. Fokus "Finanzen" schlägt "Sparplan
   für Thailand anlegen" vor. Später optional ein Sparziel mit
   Fortschrittsbalken für Träume, die Geld kosten.
7. **Push sparsam:** höchstens einer pro Woche zu Träumen, ermutigend statt
   mahnend (Prinzip Motivational Core).

### Vorschlag v1 vs. später
- **v1:** Tab mit Board (Emoji + Farbe, nach Horizont gruppiert, Erfüllt-
  Bereich); pro Traum Titel, Warum, Hindernis, Horizont, Stufe, ein nächster
  Schritt; "Als Wochen-Task übernehmen"; "Traum der Woche"-Karte auf
  `Today`; Celebrations bei Stufenwechsel/Erfüllung.
- **Später:** Fotos (Bild-Upload, Supabase Storage, native Bildauswahl →
  neuer Build), Saison-Hinweise, Sparziel, jährlicher Traum-Review,
  Schritt-Vorschläge aus der App, Erinnerungs-Notiz beim Erfüllen mit Foto.

### Datenmodell (umgesetzt in `supabase/dreams.sql`, Branch `dreams`)
Grundsatz: wenig Aufwand beim Anlegen — **nur der Titel ist Pflicht**, der
Rest wird nach und nach ergänzt (die App fragt beim ersten Öffnen nach).

`dreams` — vom Nutzer eingegeben:
- `title` (Pflicht) · `emoji` + `color` (Default von der App) · `horizon`
  (Default *Irgendwann*) · `target_label` (optionales "Bis …", frei:
  "Sommer 2027") · `why` · `feeling` · `obstacle` · `next_step` (die App
  fragt immer wieder danach)

`dreams` — von der App verwaltet (Nutzer ändert per Tipp):
- `stage` (dream → explored → planned → committed → fulfilled, plus
  let_go) · `last_activity_at` (Basis für "Traum der Woche") ·
  `fulfilled_at` + `fulfilled_note` ("Wie war's?" für die Erinnerungswand) ·
  `created_at` / `updated_at`

`dream_steps` — Historie pro Traum: `title`, `done_at`, optional `task_id`
(wenn als Wochen-Task übernommen; Abhaken des Tasks markiert den Schritt per
DB-Trigger `tasks_sync_dream_step` als erledigt).

`tasks`: neue Spalte `dream_id`; `category` ist dafür jetzt optional (Traum-
Tasks zeigen den Traum statt einer der vier Kategorien).

Später: `image_path` (Foto), beste Saison, Sparziel + gespart, Lebensbereich/
Tags (Brücke zu Fokus-Wochen), "mit wem" (Brücke zu Freund-als-Co-Pilot).
Bewusst weggelassen: Priorität/Ranking, Fortschritt in Prozent, harte
Deadlines mit Erinnerungen.

Logik in `lib/dreams.ts` (Labels, Stufen, `pickDreamOfWeek`,
`nextStepToWeeklyTask`, `completeNextStep`, `setStage`), Typen in
`types/dream.ts`.

## Fokus-Wochen (geplant, 2026-10-05)
Idee: Eine Woche lang steht ein Lebensbereich im Mittelpunkt, in dem man
**Souveränität** gewinnen will — also nicht nur "mehr machen", sondern den
Bereich im Griff haben, verstehen und bewusst gestalten. Die App stößt an,
über konkrete Schritte nachzudenken, und schiebt Richtung Verbesserung.

Mögliche Bereiche (Katalog, wie bei `challenges` in Supabase statt im Code):
- **Finanzen** — Überblick Ein-/Ausgaben, Abos ausmisten, Notgroschen,
  Altersvorsorge/ETF verstehen, Versicherungen prüfen
- **Kleidung & Stil** — Kleiderschrank ausmisten, Lücken erkennen, eigener Stil
- **Zuhause & Ordnung** — eine Ecke/ein Raum, Reparaturen, Wohlfühlen
- **Gesundheit & Vorsorge** — Vorsorgetermine, Zahnarzt, Impfpass, Hausapotheke
- **Ernährung** — Kochen statt Bestellen, Wochenplanung, Einkauf
- **Schlaf & Erholung** — Abendroutine, Schlafumgebung, Pausen
- **Bewegung & Körper** — über die Habits hinaus: Ziel, Plan, Technik
- **Beziehungen & Freundschaften** — wem man sich lange nicht gemeldet hat,
  Treffen planen, Familie
- **Beruf & Karriere** — Ziele, Gehalt, Weiterbildung, Netzwerk
- **Lernen & Wissen** — ein Thema verstehen, Buch, Kurs
- **Digitales Leben** — Passwortmanager, Backups, Bildschirmzeit, Datenschutz
- **Papierkram & Verwaltung** — Verträge, Dokumente ordnen, Steuern
- **Notfallvorsorge** — Notfallkontakte, Vollmachten, wichtige Unterlagen
  griffbereit
- **Mobilität** — Auto/Fahrrad in Schuss, Alternativen, Kosten
- **Kopf & Achtsamkeit** — Stress-Auslöser, Journaling, Grenzen setzen
- **Nachhaltigkeit** — Konsum, Energie, Müll

Kernmechanik (Vorschlag, noch nicht entschieden):
- **Start der Woche (Montag):** Bereich wählen (oder Vorschlag: der Bereich,
  der am längsten nicht dran war bzw. beim letzten Mal am schwächsten
  eingeschätzt wurde). Push: "Diese Woche: Finanzen — wie souverän fühlst du
  dich da gerade?"
- **Kurzer Selbst-Check:** 3–5 Fragen pro Bereich, je 1–5 ("Ich weiß, wofür
  ich im Monat Geld ausgebe"). Ergibt einen Souveränitäts-Wert pro Bereich.
- **Schritte überlegen statt vorgeben:** die App schlägt passende Schritte
  aus einer Ideen-Bibliothek vor ("Kontoauszüge der letzten 3 Monate
  durchgehen", "3 Abos prüfen"), man wählt 1–3 oder formuliert eigene →
  werden zu Wochen-Tasks in `Today` (Abschnitt "Diese Woche").
- **Unter der Woche:** sanfte Erinnerung, ermutigend statt mahnend (gleiches
  Prinzip wie Motivational Core); Fokus-Bereich sichtbar oben auf `Today`.
- **Ende der Woche (Sonntag):** kurze Reflexion ("Was hat sich verändert?"),
  Selbst-Check wiederholen → Fortschritt sichtbar, Celebration bei
  Verbesserung.
- **Langfristig:** Bereiche alle paar Monate wiederholen; im `Review` ein
  Überblick ("Souveränitäts-Radar") über alle Bereiche und ihre Entwicklung.

Verknüpfungen: passt zur Drei-Horizonte-Struktur (Fokus-Woche speist die
Wochen-Tasks), zu Träumen (Fokus "Finanzen" kann Schritte für "Reise nach
Thailand" enthalten) und Challenges.

Datenmodell-Skizze: `focus_areas` (Katalog: Titel, Emoji, Selbst-Check-
Fragen, Schritt-Ideen) + `focus_weeks` (user_id, week_key, area_id,
check_before, check_after, reflection) + `tasks.focus_week_id`. Neue
Tabellen mit `user_id` + RLS von Anfang an.

Offene Fragen: Jede Woche ein Fokus oder nur jede zweite/auf Wunsch (sonst
Überforderung neben Habits + Challenge)? Feste Rotation vs. freie Wahl vs.
Vorschlag nach schwächstem Bereich? Wie lang/kurz darf der Selbst-Check
sein, damit er nicht nervt? — Vor der Umsetzung: HTML-Mockup.

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
