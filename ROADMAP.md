# Roadmap

## Vision
Kein reiner Habit-Tracker, sondern eine Growth-App: tägliche Gewohnheiten
im Griff behalten *und* regelmäßig Impulse setzen, die aus der Komfortzone
holen (Challenges), dazu große Lebensträume präsent halten und Schritt für
Schritt angehen. Ursprünglich für den Eigenbedarf gebaut; seit 2026-10-05
mehrbenutzerfähig (anonyme Accounts), ein öffentlicher Play-Store-Release
ist vorbereitet, aber noch nicht entschieden.

## Überblick (Stand 2026-10-09)

| Baustein | Status | Abschnitt |
|---|---|---|
| Habits, `Today`, `Review` | live | Stand |
| Wochen-Tasks + Monatsziele + Challenges | live | Drei Zeithorizonte |
| Motivational Core (Streak, Momentum, Celebrations) | live | Motivational Core |
| Accounts (anonym + "Konto sichern", Daten löschen) | live | Accounts |
| Träume v1 (Board, Detail, Stufen, Erinnerungswand) | live | Träume |
| Traum-Fotos (automatisch, KI + Unsplash) | live | Träume → Fotos |
| Home-Screen-Widgets (4 Größen, mit Fotos) | live | Widgets |
| EAS Update (JS-Änderungen ohne neuen Build) | live | Play-Store → Build |
| **`Today` entschlacken / Wochenplanung** | **Mockup abgestimmt (Variante C)** | Fokus statt Überladung |
| Fokus-Wochen | Konzept | Fokus-Wochen |
| Social: gemeinsame Challenges (Duo) | Konzept | Social |
| Play-Store-Release | vorbereitet, nicht entschieden | Play-Store-Release |

## Next (Reihenfolge = Priorität)
1. **`Today` entschlacken** (Grundsatz "Fokus statt Überladung"): Mockup
   abgestimmt (Variante C mit Pfirsich-Wochenkarte), offene Detailfragen
   klären, dann umsetzen (`Today` + Wochenplanung). Bewusst **vor** Fokus-Wochen
   und Social, weil beide sonst noch mehr auf `Today` stapeln würden.
2. **Dogfooding** (eine Woche) mit Fotos + Widgets: Reibung notieren (passen
   die Fotos? nervt der Alert beim Challenge-Ziehen/bei der Kategorie-Wahl?
   fehlt eine Übersicht über erledigte Items über Zeit?). Speist direkt
   Punkt 1.
3. **Monats-Review:** erledigte Challenges/Monatsziele + Wochen-Tasks-Quote
   in `Review` — Daten existieren, Review-UI zieht noch nicht nach. Passt zu
   "Kein Schuld-Stapel": Review zeigt vor allem, was geschafft wurde.
4. **Gezogene Challenge als eigene Karte/State statt `Alert.alert`** — v.a.
   relevant, falls die Challenge länger "aktiv" bleibt (ongoing-Kategorie)
   und man sie wiederfinden will, ohne erneut zu ziehen.
5. Danach: Fokus-Wochen *oder* Social (je nach Ergebnis von 1), Play-Store
   nur, falls der Release entschieden wird.

## Grundsatz: Fokus statt Überladung (Gedanke 2026-10-07)
Sorge: Habits + Wochen-Tasks + Challenges + Monatsziele + Träume + (geplant)
Fokus-Wochen + gemeinsame Challenges — zusammen kann das **zu viel** werden.
Unerledigtes stapelt sich, die App wirkt dann eher wie eine Mahnliste als
wie ein Antrieb, und `Today` zeigt viel zu viele Informationen statt weniger
wichtiger Dinge. Ziel: alle Bausteine behalten, aber **nie alles
gleichzeitig zeigen**.

Ideen (noch nicht entschieden):
1. **"Heute zählt" statt "alles für heute":** `Today` zeigt oben nur 1–3
   wirklich wichtige Dinge (z.B. fällige Habits + die eine Wochen-Priorität),
   alles Weitere eingeklappt hinter "Alles anzeigen".
2. **Wochenplanung als einziger Eingang:** ein kurzes Ritual (Sonntag/
   Montag, ~5 Min), in dem man aus allen Quellen — Traum-Schritte, Fokus-
   Bereich, Challenge, eigene Ideen — **höchstens 3 Wochen-Prioritäten**
   wählt. Alles andere bleibt im Hintergrund (Backlog/Träume-Tab) und
   taucht nicht auf `Today` auf. Das ist der Hebel, der die vielen
   Bausteine bündelt, statt sie zu addieren.
3. **Fokus-Wochen nicht zusätzlich, sondern anstelle:** in einer Fokus-
   Woche *sind* die Wochen-Prioritäten die Schritte des Fokus-Bereichs;
   Challenge/Traum-Schritt pausieren in der Woche. Und Fokus-Wochen nicht
   jede Woche, sondern z.B. **einmal im Monat** oder nur auf Wunsch.
4. **Kein Schuld-Stapel:** Unerledigtes wird am Wochenende nicht "überfällig"
   mitgeschleppt, sondern kurz entschieden: *Mitnehmen / Später / Loslassen*.
   Keine roten Zähler für Verpasstes; Review zeigt vor allem, was geschafft
   wurde (passt zu "Fortschritt statt Perfektion").
5. **Module wählbar:** in den Einstellungen festlegen, welche Bausteine aktiv
   sind (z.B. nur Habits + Träume). Neue Nutzer starten minimal; die App
   schlägt weitere Bausteine erst vor, wenn das Bisherige läuft
   ("progressive disclosure": z.B. nach 2 Wochen Habits den ersten Traum).
6. **Sanfte Obergrenzen:** Empfehlung von ~3–5 aktiven Habits und 3
   Wochen-Prioritäten; mehr ist möglich, aber die App weist freundlich darauf
   hin, dass weniger oft mehr bringt.

Entschieden (2026-10-07):
- Wochenplanung ist **optional**, kein Pflicht-Ritual.
- **Habits bleiben vorerst immer auf `Today` sichtbar** (nicht hinter "Heute
  zählt"/"Alles anzeigen" versteckt).
- Wie genau sich UI und Nutzung ändern (was wann wo gezeigt wird),
  wird später entschieden — bis dahin keine Umsetzung, nur Konzept.

**Mockup abgestimmt (2026-10-09), Variante "C" mit Pfirsich-Wochenkarte**
(Canvas "Today entschlacken"), von oben nach unten:
1. Kopf wie bisher (Datum, "Heute", Encouragement-Zeile).
2. **Wochenkarte "Diese Woche zählt"** in Pfirsich (Ton der Traum-Karten)
   mit 3-teiligem Fortschrittsbalken und den bis zu 3 Wochen-Prioritäten.
   Ein Traum-Schritt erscheint als Karte mit Foto ("Schritt zu: …") — das
   ersetzt die separate "Traum der Woche"-Karte. Unten "+ N weitere diese
   Woche" (Tasks außerhalb der Top 3) und "Woche anpassen".
3. **Challenge** als eigene, gut sichtbare Karte direkt darunter (nicht
   unten versteckt), mit Restlaufzeit und "Geschafft".
4. **Gewohnheiten mit Tagesring** (z.B. 2/5) + kompakte Liste mit Serien,
   Momentum und Wochenziel.
Wegfallen: die zwei Statistik-Karten (ersetzt durch den Ring), die
separate Traum-der-Woche-Karte, das Task-Eingabefeld auf `Today` (neue
Tasks über die Wochenplanung bzw. "+ N weitere").
**Wochenplanung** als eigener Screen: "Von letzter Woche offen" mit
Mitnehmen/Später/Loslassen, Vorschläge aus Traum-Schritten, Challenge,
Monatszielen und lange nicht bedienten Kategorien, max. 3, "nichts
wählen" ist okay.
Ideen aus der lebendigeren Variante C2 (für später/zur Wahl): Wochenleiste
Mo–So, Emoji-Symbol pro Gewohnheit, warmer Grundton für die ganze App.

Offene Fragen: Challenges bleiben monatlich (Karte zeigt Restlaufzeit)? Zählt
der Tagesring nur Gewohnheiten? Reihenfolge Prioritäten → Challenge →
Gewohnheiten so lassen? Wann erscheint die Einladung zur Wochenplanung
(Sonntagabend, Montag, nur manuell)? Welche Bausteine sind in
Fokus-Wochen-Monaten pausiert? Wo lebt die gemeinsame Challenge (Social)?

## Stand: was live ist
- **Core-Habit-Tracking** (`Today` / `Habits` / `Review`) gegen Supabase.
- **Habit-Frequenz** (2026-10-05): jeder Habit hat ein Wochenziel
  (`habits.target_per_week`, 7 = täglich, 1–6 = x-mal pro ISO-Woche).
  1–6×-Habits haben Wochen-Streak/-Momentum, Celebration beim Erreichen des
  Wochenziels, zählen in `Today` nicht mehr als "fällig", wenn das Ziel schon
  steht, und `Review`/Push-Quote messen gegen das Ziel statt gegen 7/7.
  `supabase/habit_frequency.sql` ist ausgeführt.
- **Challenges-Tab** (`app/(tabs)/challenges.tsx`), Seed-Daten in
  `supabase/challenges.sql` (Tabellen in `supabase/schema.sql`).
- **Wochen-Tasks** (`Today`, Abschnitt "Diese Woche") + **Monatsziele**
  (`Challenges`, Abschnitt "Monatsziele"), nach Mockup umgesetzt.
- **Motivational Core** (Streak/Momentum/Celebration/Encouragement).
- **Accounts:** anonymer Account beim ersten Start, "Konto sichern" per
  E-Mail-Code, Anmelden auf weiteren Geräten, Abmelden, alle Daten löschen.
- **Träume v1** inkl. "Traum der Woche" auf `Today`, **automatische Fotos**
  (2026-10-09) und **Home-Screen-Widgets** in 4 Größen mit Fotos.
- **Styling-Konstanten** zentral in `constants/theme.ts` (2026-10-09, PR #8).
- **EAS Update** (2026-10-09): JS-Änderungen ohne neuen Build aufs Handy.

## Struktur: drei Zeithorizonte

| Horizont | Was | Rhythmus | Kategorisiert? | Lebt wo? |
|---|---|---|---|---|
| Täglich | Habits | wiederkehrend, binär | nein, freitext | `Today` / `Habits` |
| Wöchentlich | Tasks | einmalig pro Woche | ja, gleiche 4 Kategorien wie Challenges (körperlich/kreativ/sozial/handwerklich); Traum-Tasks zeigen stattdessen den Traum | `Today` (Abschnitt "Diese Woche" über den Habits) |
| Monatlich | Challenge (gezogen) **+** freie Monatsziele | einmalig pro Monat | Challenge ja, freie Ziele optional | `Challenges`-Tab |
| Langfristig | Träume / Lebensziele | kein fester Rhythmus, über Jahre | nein (später evtl. Lebensbereich/Tags) | eigener Tab `Träume` |

Entscheidung (2026-10-01): Wochen-Tasks sind an die 4 Kategorien gekoppelt.
Monatsziele sind NICHT nur die gezogene Challenge — zusätzlich lassen sich
frei formulierte Monatsziele eintragen (z.B. "Umzug organisieren"), beides
lebt im `Challenges`-Tab, der damit zum "Monats-Hub" wird.

Optionale spätere Verknüpfung (nicht für v1): ein Wochen-Task kann auf eine
Challenge/ein Monatsziel zeigen (`source_id`), um große Ziele in Wochen-
Schritte runterzubrechen. Erstmal weglassen, bis sich zeigt, ob's gebraucht
wird. (Für Träume gibt es das bereits: `tasks.dream_id`.)

### Datenmodell
- `tasks`: id, title, category (optional), week_key (ISO-Woche, z.B.
  "2026-W40"), done, completed_at, created_at, dream_id (optional) — eigene
  Zeilen pro Woche statt dauerhafter Katalog wie bei `challenges`.
- `monthly_goals`: id, title, month_key (z.B. "2026-10"), done, completed_at,
  created_at — freie Ziele, unabhängig von `challenges`.

Umgesetzt in `supabase/tasks_and_goals.sql`, Typen in `types/task.ts` /
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

## Accounts / Multi-User (live seit 2026-10-05)
Ziel: andere Leute können die App mit eigenen Habits/Zielen/Challenges/
Träumen nutzen. Grundsatz: **so bequem wie möglich — kein Login-Zwang.**

- **Anonym zuerst:** beim ersten Start legt die App still einen anonymen
  Supabase-Account an (`ensureSession` in `lib/supabase.ts`, Gate in
  `app/_layout.tsx`). Kein Login-Screen, man startet sofort. Die Session
  bleibt auf dem Gerät gespeichert — "Login" passiert genau einmal, unsichtbar.
  **Risiko ohne Sicherung:** App löschen = anonymer Account weg.
- **Konto sichern (live seit 2026-10-06), nach Mockup:** Zahnrad oben rechts
  auf `Today` → `app/settings.tsx` (eigener Screen, kein Tab) mit
  Konto-Status, "Mit E-Mail sichern" (6-stelliger Code, kein Passwort →
  gleiche `user_id`, alle Daten bleiben), "Schon gesichert? Hier anmelden"
  (ersetzt ungesicherte Daten auf dem Gerät, mit Warnung vorher),
  "Abmelden" und "Alle meine Daten löschen" (Bestätigung durch Eintippen von
  LÖSCHEN, RPC `delete_my_account` in `supabase/delete_account.sql`).
  Hinweis-Karte auf `Today` nach 7 Tagen für ungesicherte Accounts,
  "Später" blendet sie dauerhaft aus. Logik in `lib/account.ts`.
  Entschieden: nur E-Mail-Code (kein Google vorerst); CAPTCHA vor dem
  geschlossenen Play-Test; beim Anmelden ersetzen statt zusammenführen.
  Voraussetzung in Supabase: Mail-Vorlagen "Magic Link" und "Change Email
  Address" mit `{{ .Token }}`; Email-OTP-Länge auf **6** (die App erwartet
  6 Ziffern, Supabase-Default war 8); SMTP aktuell über Gmail
  (App-Passwort) — vor einem Release besser Resend mit eigener Domain.
  Notfall-Datenumzug auf einen neuen Account per
  `supabase/auth_3_move_data_to_new_account.sql`.
- **Datenbank:** `user_id` (Default `auth.uid()`) auf `habits`, `logs`,
  `tasks`, `monthly_goals`, `challenge_progress`, `dreams`, `dream_steps`;
  RLS "nur eigene Zeilen"; `challenges`-Katalog bleibt geteilt. Migration in
  zwei Teilen: `supabase/auth_1_user_columns.sql` (additiv) und
  `supabase/auth_2_claim_and_lock.sql` (bisherige Daten dem ersten Account
  zuordnen, anon-Zugriff entfernen).
- Neue Tabellen bekommen `user_id` + RLS von Anfang an.
- Später: Google-Login als Alternative zum E-Mail-Code, CAPTCHA/Turnstile
  gegen Missbrauch der anonymen Anmeldung (Supabase-Empfehlung), eigener
  SMTP-Anbieter (Resend o.ä.) für die Code-Mails, Aufräumen alter
  ungesicherter Accounts.

## Träume / Lebensziele (v1 live seit 2026-10-06)
Idee: eine Mischung aus Vision Board und Bucket List für Dinge, die man im
Leben noch machen will ("Surfen lernen", "Reise nach Thailand", "Marathon").
Die App soll Träume nicht nur sammeln, sondern **präsent halten** und zum
**nächsten kleinen Schritt** schubsen, statt sie auf "irgendwann" zu schieben.

> Status: **v1 umgesetzt** nach abgestimmtem Mockup: Tab
> `app/(tabs)/dreams.tsx` (Board), `app/dream/new.tsx`, `app/dream/[id].tsx`
> (Detail mit nächstem Schritt, Stufen, Loslassen, Erfüllen mit "Wie war's?"),
> `app/dream/memories.tsx` (Erinnerungswand), "Traum der Woche"-Karte +
> Traum-Badge auf Wochen-Tasks in `Today`, Celebrations bei
> Schritt/Stufenwechsel/Erfüllung. `supabase/dreams.sql` ist ausgeführt.
> Automatische Fotos seit 2026-10-09 (siehe unten). Der Rest dieses
> Abschnitts bleibt Ideensammlung für später.

**Schon entschieden (2026-10-06):**
- Eigener Tab "Träume" (nicht im `Challenges`-Hub) — emotional etwas anderes
  als Challenges, und ein Tab hält sie präsent.
- Keine Begrenzung der Anzahl Träume. Gegen Überforderung hilft stattdessen
  der wöchentliche Fokus auf *einen* Traum (siehe "Traum der Woche").

**Psychologischer Grundsatz:** Reines Schwärmen (Vision Board nur anschauen)
senkt laut Forschung (Oettingen, "WOOP"/Mental Contrasting) eher die
Handlungsenergie. Wirksamer: Traum lebendig vorstellen → ehrlich das
Hindernis benennen → konkreten nächsten Schritt festlegen, ideal als
Wenn-dann-Plan. Die App verbindet deshalb das Emotionale eines Vision Boards
mit dem Konkreten eines Plans.

### Darstellung
- **Board statt Liste:** jeder Traum als Karte (Foto vollflächig mit
  Text-Panel in Traumfarbe, ohne Foto Emoji + Farbe; Titel, Stufe, nächster
  Schritt). Gruppiert nach Horizont: *Dieses Jahr* / *In 1–3 Jahren* /
  *5+ Jahre* / *Irgendwann*.
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

### Später
Eigenes Foto (Bild-Upload, Supabase Storage, native Bildauswahl → neuer
Build; hat Vorrang vor dem automatischen, siehe Fotos), Saison-Hinweise,
Sparziel, jährlicher Traum-Review, Schritt-Vorschläge aus der App,
Erinnerungs-Notiz beim Erfüllen mit Foto, gemeinsame Träume (siehe Social v3).

### Fotos (automatisch, live seit 2026-10-09)
Träume bekommen ein passendes Foto, **ohne dass der Nutzer selbst ein Bild
auswählen muss**.

- **Automatisch und einmalig:** beim Anlegen eines Traums holt die App ein
  Bild; Träume ohne Versuch werden beim App-Start nachgeholt
  (`image_attempted`). Ein geänderter Titel ändert das Bild nicht. Ohne Bild
  bleibt es bei Emoji + Farbe — keine Lade- oder Fehleranzeige.
- **KI formuliert die Suche:** aus Titel, Gefühls-Satz und Warum macht
  Claude Haiku 5.5 drei englische Suchbegriffe von konkret bis allgemein
  ("Surfen lernen" → "surfer riding first wave at sunrise" / "surfer riding
  wave" / "surfing"). Gesucht wird mit dem ersten, die weiteren nur bei 0
  Treffern.
- **KI wählt das Bild:** Unsplash liefert bis zu 6 Kandidaten; die KI sieht
  sich die Vorschaubilder an und rankt sie (der Traum erfüllt statt
  Vorbereitung, Personen von hinten/in der Ferne, warmes Licht, kein
  Produkt, kein Text). Kosten: Bruchteil eines Cents pro Traum.
- **Ausweg:** "Anderes Bild" nimmt still den nächstbesten Kandidaten — ohne
  KI, ohne Tageslimit, kein Auswahl-Screen.
- **Grenzen:** max. 4 KI-Aufrufe pro Nutzer und Tag (`claim_image_call`);
  liefert die KI nichts Brauchbares, bleibt der Traum ohne Bild.
- **Technik:** Supabase Edge Function `supabase/functions/dream-image` hält
  die API-Keys (Anthropic + Unsplash) als Secrets — nie im App-Code.
  Deployment per Einfügen in den Dashboard-Editor, deshalb ist `index.ts`
  eigenständig (Importe als `npm:paket@version`, kein `deno.json`).
  Migrationen `supabase/dream_images.sql` + `dream_images_2_attempted.sql`.
  App: `lib/dream-image.ts`. Board-Karten vollflächig mit Foto + Text-Panel
  in Traumfarbe (88 % deckend), Detail mit Foto-Header, Credit-Zeile "Foto:
  Name / Unsplash" (Pflicht) und "Anderes Bild". Mockup abgestimmt.
- **Entschieden (2026-10-09):** Ein eigenes Foto (geplantes `image_path`)
  hat Vorrang vor dem automatischen: Anzeige `image_path ?? image_url`,
  "Anderes Bild" nur ohne eigenes Foto, die automatische Suche überschreibt
  nie ein eigenes Foto. Eigenes Foto entfernen → das automatische ist wieder
  sichtbar.

### Datenmodell (`supabase/dreams.sql`)
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
- Foto: `image_url`, `image_credit`, `image_credit_url`, `image_source`,
  `image_queries`, `image_candidates`, `image_index`, `image_attempted`

`dream_steps` — Historie pro Traum: `title`, `done_at`, optional `task_id`
(wenn als Wochen-Task übernommen; Abhaken des Tasks markiert den Schritt per
DB-Trigger `tasks_sync_dream_step` als erledigt).

`tasks`: Spalte `dream_id`; `category` ist dafür optional (Traum-Tasks zeigen
den Traum statt einer der vier Kategorien).

Später: `image_path` (eigenes Foto), beste Saison, Sparziel + gespart,
Lebensbereich/Tags (Brücke zu Fokus-Wochen), "mit wem" (Brücke zu Social).
Bewusst weggelassen: Priorität/Ranking, Fortschritt in Prozent, harte
Deadlines mit Erinnerungen.

Logik in `lib/dreams.ts` (Labels, Stufen, `pickDreamOfWeek`,
`pickDreamOfDay`, `nextStepToWeeklyTask`, `completeNextStep`, `setStage`),
Typen in `types/dream.ts`.

## Home-Screen-Widgets: Träume & Ziele (live seit 2026-10-06)
Bewusst **für Träume und größere Ziele, nicht für tägliche Habits**. Habits
sieht man beim Öffnen der App ohnehin; Träume rutschen im Alltag aus dem
Blick. Ein Widget ist ein Vision Board, das man 50-mal am Tag sieht.

**Umgesetzt:** ein Traum-Widget (`widgets/`) in 4 Größen (4×2, 2×2, Zeile
4×1, Mini 1×1) mit zwei Modi, beim Platzieren gewählt:
1. **"Wechselnd" = "Traum des Tages"** (Default) — deterministische
   Tagesrotation durch alle offenen Träume, vernachlässigte und nahe
   Horizonte etwas öfter (`pickDreamOfDay`). Bewusst getrennt vom "Traum der
   Woche" auf `Today`: Widget = Inspiration (alle Träume präsent), `Today` =
   Fokus (ein Traum bekommt diese Woche einen Schritt).
2. **"Fester Traum"** — ein ausgewählter Traum pro Widget, zeigt den
   **Gefühls-Satz** + nächsten Schritt: lebendiges Bild + konkreter Schritt,
   genau die Kombination, die laut Forschung motiviert. Mehrere platzierbar.

- **Fotos (2026-10-09):** alle vier Größen zeigen das Traum-Foto vollflächig
  mit Text-Panel (Mockup "Widgets mit Foto"). Die Widget-Bibliothek könnte
  https-Bilder direkt laden, aber ohne Cache bei jedem Neuzeichnen (~alle
  30 Min.). Deshalb `widgets/widget-images.ts`: jedes Foto einmal in 600 px
  laden, als data:-URI in AsyncStorage speichern, nur bei neuem Foto neu
  holen (auch offline sichtbar). Kopien gelöschter Träume werden beim
  nächsten Laden der Traumliste entfernt.
- **Interaktion:** Tippen öffnet den Traum (`lifedirector://dream/<id>`).
- **Technik:** `react-native-android-widget` (JSX → natives Widget-Layout,
  Config-Plugin, EAS Build). Ein Task-Handler (JS im Hintergrund) lädt die
  Daten aus Supabase mit der gespeicherten Session; die App zeichnet Widgets
  beim Start, nach Traum-Änderungen und nach neuen Fotos neu, zusätzlich
  Android alle 30 Min. Widget-Code wird nur in echten Android-Builds geladen
  (`lib/widget-bridge.ts`, Einstieg `index.ts`), Expo Go bleibt lauffähig.
  Widget-Komponenten brauchen `"use no memo"` (React Compiler). EAS Updates
  erreichen auch den Widget-Task (getestet 2026-10-09).
- iOS (nur falls je relevant): WidgetKit in Swift/SwiftUI als zusätzliches
  Target (z.B. `@bacons/apple-targets`), Daten über App Group.

**Später:**
- **"Schritt erledigt ✓" direkt im Widget** → markiert den nächsten Schritt
  erledigt, Widget fragt dann "Was ist dein nächster Schritt?" → Tippen
  öffnet die App zum Eintragen.
- **Traum-Board** (mittel/groß) — 2–4 Träume als Mini-Karten mit Fotos, ein
  echtes Vision Board auf dem Startbildschirm.
- **"Mein Monat"** — aktuelle Challenge + Monatsziele mit Fortschritt (1/3).

## Fokus-Wochen (Konzept, 2026-10-05)
Idee: Eine Woche lang steht ein Lebensbereich im Mittelpunkt, in dem man
**Souveränität** gewinnen will — also nicht nur "mehr machen", sondern den
Bereich im Griff haben, verstehen und bewusst gestalten. Die App stößt an,
über konkrete Schritte nachzudenken, und schiebt Richtung Verbesserung.

> Hinweis (2026-10-07): siehe "Grundsatz: Fokus statt Überladung" — Fokus-
> Wochen eher als Ersatz für die normalen Wochen-Prioritäten (nicht
> zusätzlich) und seltener (z.B. monatlich/auf Wunsch).

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

## Social: gemeinsame Challenges (Konzept, 2026-10-08)
Idee: Challenges mit einem Freund teilen — sich gegenseitig z.B. für 4
Wochen herausfordern, Fortschritt teilen und den des anderen sehen. Ersetzt
die frühere Idee "Freund-als-Co-Pilot". Soziale Verbindlichkeit ist einer
der stärksten Motivatoren — entscheidend ist, dass es **motiviert statt
Druck oder Konkurrenz** erzeugt.

**Entschieden (2026-10-08):**
- **Nur Duo** zum Start (zwei Personen), Gruppen später.
- **Fortschritt des Freundes immer sichtbar**, direkt neben dem eigenen.
- **Beliebige Challenges** — aus dem Katalog oder frei formuliert
  ("4 Wochen kein Zucker").

Grundprinzipien:
- **Kooperativ statt kompetitiv:** "Wir schaffen das zusammen" statt
  Rangliste — wer zurückfällt, wird mitgezogen statt abgehängt.
- **Klein & privat:** sichtbar ist nur die gemeinsame Challenge, nichts
  sonst aus der App des anderen. Kein Feed.
- **Ermutigend statt beschämend:** verpasster Tag = "Pause", nicht
  "gescheitert" (passt zu "Fortschritt statt Perfektion").

Kernmechanik (v1):
1. **Gemeinsam starten:** Challenge wählen oder frei formulieren, Dauer
   (z.B. 4 Wochen) und Rhythmus (z.B. 3×/Woche) festlegen; Freund per
   **6-stelligem Code** einladen. Beide notieren kurz ihr **Warum**.
2. **Check-ins:** jeder hakt seine Einheiten ab, optional mit einer
   Ein-Zeilen-Notiz ("5 km im Regen 💪").
3. **Gemeinsame Ansicht:** beide Fortschritte nebeneinander + ein
   **Team-Fortschritt** ("Zusammen 14/24 Einheiten") und eine
   **Team-Streak** (läuft, solange beide im Wochenrhythmus bleiben).
4. **Reaktionen:** ein Tipp auf den Check-in des anderen: 🙌 🔥 💪 — der
   kleinste, aber stärkste Motivator ("meine Mühe wurde gesehen").
5. **Gemeinsamer Abschluss:** geteilter Celebration-Screen + Eintrag
   "Gemeinsam geschafft" auf beiden Erinnerungswänden, mit den Notizen der
   4 Wochen als Rückblick.
- Aktualisierung in v1 beim Öffnen der App (noch kein Push).

Später:
- **v2:** Push-Nachrichten (Check-in des Freundes, sanftes "Anstupsen"
  max. 1×/Tag als "Lisa denkt an dich 👋", Anfeuern) — nur mit feinem
  Opt-in; **Joker-Tage** (z.B. 2 pro Challenge, damit Krankheit/Reise die
  Team-Streak nicht bricht); Halbzeit-Moment; optionaler Spaß-Einsatz
  ("wer aussteigt, zahlt den Kaffee" — nie echtes Geld in der App).
- **v3:** Gruppen (3–4), Foto-Nachweis bei Check-ins, gemeinsame Träume
  ("Gemeinsam nach Thailand").

Technik:
- Beide brauchen ein **gesichertes Konto** (E-Mail, existiert bereits).
- Neue Tabellen mit RLS "nur Teilnehmer sehen die gemeinsame Challenge":
  `shared_challenges` (Titel, Beschreibung, Dauer, Rhythmus, Code,
  Ersteller, Start/Ende), `shared_challenge_members` (user_id, Warum,
  Anzeigename), `shared_checkins` (user_id, Datum, Notiz),
  `shared_reactions` (checkin_id, user_id, Emoji). Beitritt per Code über
  eine `security definer`-Funktion, damit niemand fremde Challenges
  auflisten kann.
- Anzeigename pro Teilnehmer (die App kennt bisher keine Namen).
- Push zwischen Nutzern (v2) braucht Server-Logik (Supabase Edge Function +
  Expo Push) — größter neuer Baustein, deshalb nicht in v1. (Edge Functions
  sind seit den Traum-Fotos eingerichtet.)
- Vor der Umsetzung: Mockup (Einladen/Beitreten, gemeinsame Ansicht,
  Abschluss) — und klären, wo die gemeinsame Challenge im entschlackten
  `Today` lebt.

## Play-Store-Release (vorbereitet, noch nicht entschieden)
Ziel: LifeDirector öffentlich im Google Play Store. Größter Zeitfaktor ist
der Pflicht-Testlauf für neue private Entwicklerkonten — deshalb früh
anfangen und parallel an der App arbeiten, falls der Release kommt.

**1. Entwicklerkonto** (zuerst, läuft im Hintergrund)
- Google Play Console: 25 $ einmalig + Identitätsprüfung (dauert Tage).
- Neue private Konten: geschlossener Test mit mind. 12 Testern, 14 Tage am
  Stück, bevor Produktionszugang beantragt werden kann (Zahlen in der
  Console gegenprüfen, Google ändert das gelegentlich). Tester früh suchen.

**2. App-Voraussetzungen**
- [x] Package-Name festgelegt (2026-10-06): `com.lifedirector.app` (Android
      + iOS-Bundle-ID, Scheme `lifedirector`) — neutral statt Klarname, weil
      der Package-Name öffentlich im Play-Store-Link steht. Für volle
      Neutralität beim Release zusätzlich: eigene App-E-Mail (Support-Kontakt
      + SMTP-Absender) und "LifeDirector" als Entwicklername in Play.
- [x] "Konto sichern" (siehe Accounts) — live.
- [ ] "Account/Daten löschen": in der App erledigt (Einstellungen); fehlt
      noch die Web-Seite für Löschanfragen (Play-Pflicht).
- [ ] CAPTCHA (Cloudflare Turnstile) für die anonyme Anmeldung in Supabase.
- [ ] Supabase-Plan prüfen: Free-Projekte pausieren nach 7 Tagen Inaktivität,
      nur einfache Backups → mit echten Nutzern Pro (~25 $/Monat) erwägen.
- [ ] Unsplash: vor einem Release Produktionszugang beantragen (Demo-Limit
      50 Anfragen/Stunde); Anthropic-Ausgabenlimit in der Console prüfen.

**3. Build & Update**
- EAS Update ist eingerichtet (2026-10-09, `expo-updates`, Kanäle
  `preview`/`production` in `eas.json`, `runtimeVersion` per Fingerprint):
  reine JS-Änderungen ohne neuen Build per
  `npx eas-cli update --channel preview --platform android --message "…" --environment preview`
  (`--platform android` ist nötig: der Web-Export scheitert an Supabase/`window`).
  Neue native Module (oder Plugin-/app.json-Änderungen) ändern den
  Fingerprint → dann wieder ein neuer Build nötig.
- Test-Build: `npx eas-cli build --platform android --profile preview` (APK,
  über die alte App installieren).
- Release: `npx eas-cli build --platform android --profile production` → AAB
  statt APK (`autoIncrement` für versionCode steht schon in `eas.json`).
- Ersten Build manuell in der Play Console hochladen; danach
  `npx eas-cli submit --platform android` (braucht einmalig einen Google-
  Service-Account-Key). Signing: Play App Signing, EAS-Key bleibt Upload-Key.
- Bekannt: `npx expo install` scheitert an npm (EALLOWSCRIPTS) → Pakete mit
  `npm install paket@~<SDK-Version>` installieren.

**4. Store-Eintrag & Formulare**
- [ ] Texte: Name, Kurzbeschreibung (≤ 80 Zeichen), Beschreibung (≤ 4000);
      Deutsch zuerst, Englisch später.
- [ ] Grafiken: Icon 512×512, Feature-Grafik 1024×500, ≥ 2 Handy-Screenshots
      (echte Screenshots, `docs/mockup.png` als Stil-Vorlage).
- [ ] Datenschutzerklärung (öffentliche URL, DSGVO): was in Supabase
      gespeichert wird, Region des Projekts, wie man löscht; dazu die
      Weitergabe von Traum-Texten an Anthropic (Foto-Suche) und das Laden
      der Fotos von Unsplash.
- [ ] Formulare: Datensicherheit, Altersfreigabe, Zielgruppe, Werbung
      (keine), App-Zugriff (kein Login nötig).

**5. Release-Weg**
Interner Test (nur ich) → geschlossener Test (≥ 12 Tester, 14 Tage) →
Produktionszugang beantragen → Review (meist wenige Tage) → live.

**Reihenfolge:** Konto eröffnen → parallel App-Voraussetzungen (Lösch-
Webseite, CAPTCHA) → Datenschutz/Texte/Screenshots → Production-Build +
interner Test → geschlossener Test starten → nach 14 Tagen Produktion
beantragen.

## Later / Ideen (ungeprüft)
- Wochen-Tasks optional mit Challenge/Monatsziel verknüpfen (Hierarchie
  Monat → Woche → Tag), siehe Drei Zeithorizonte — erst wenn sich der Bedarf
  zeigt.
- Erinnerungen für aktive Challenges/offene Wochen-Tasks (analog
  `lib/notifications.ts`) — mit Blick auf "Fokus statt Überladung" sparsam.
- Explizite "Exploration"-Komponente, die aktiv neue Habits/Challenges
  vorschlägt (aus Phase-2-Prinzipien übrig, noch nicht umgesetzt) — die
  Challenge-Ziehen-Mechanik deckt das fürs Monatliche schon ab, fürs
  Tägliche/Wöchentliche noch offen. Passt zu "Module wählbar /
  progressive disclosure".
- Sound/Haptics beim Celebration-Moment (aktuell nur Animation + Text).
- Abhängige Pakete aktuell halten (`npx expo install --check` meldete
  2026-10-09 Patch-Rückstände bei `expo-linking`, `expo-notifications`,
  `expo-router`) — beim nächsten nativen Build mitnehmen.

## Entscheidungen, die schon getroffen wurden
- ~~Kein Auth, kein Multi-User~~ → revidiert 2026-10-05: Multi-User mit
  anonymem Account zuerst und optionaler E-Mail-Sicherung, siehe "Accounts /
  Multi-User". "Mit Freund"-Markierung bei Challenges ist weiterhin nur ein
  Hinweis-Badge; echte geteilte Challenges sind als "Social" geplant.
- Challenges-Daten leben in Supabase (Tabellen `challenges` +
  `challenge_progress`), nicht hart im Code — konsistent zum
  Habits/Logs-Pattern.
- Drei-Zeithorizonte-Struktur (täglich/wöchentlich/monatlich, plus
  langfristig Träume) wie oben beschrieben, inkl. Kategorie-Kopplung der
  Wochen-Tasks und freier Monatsziele zusätzlich zur Challenge.
- Visuelles Design vorab als HTML-Mockup abgestimmt, dann 1:1 in React
  Native umgesetzt (2026-10-02) — bei größeren UI-Änderungen gleiches
  Vorgehen: erst Mockup, dann Code.
- Wochenplanung optional, Habits immer sichtbar auf `Today` (2026-10-07).
- Social startet als Duo, Fortschritt des Freundes immer sichtbar,
  beliebige Challenges (2026-10-08).
- Traum-Fotos: automatisch, einmal pro Traum, kein Wechsel bei
  Titeländerung, eigenes Foto hat später Vorrang (2026-10-09).
- Secrets (API-Keys) nur als Supabase-Secrets, nie im App-Code oder Repo.
