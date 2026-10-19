-- Seed data. Run supabase/schema.sql first to create the tables and policies.
-- Safe to re-run: existing challenge titles are left unchanged.

-- Make the original Berlin-specific entries neutral (the catalog is shared by all users).
update challenges set title = 'Zufälliger Ort in deiner Stadt, hinlaufen'
  where title = 'Zufälliger Ort in Berlin, hinlaufen';
update challenges set description = 'Einmaliger Pottery-Schnupperkurs, viele Studios bieten das an.'
  where title = 'Töpfer-Workshop';

insert into challenges (title, description, category, size, friend_friendly) values
  -- Micro-Challenges (unter 30 Min, sofort startbar)
  ('Ein Gericht aus einer fremden Küche kochen', 'Wähl eine Küche, die du noch nie gekocht hast, und mach dich an ein Gericht daraus.', 'kreativ', 'micro', false),
  ('Skizze von etwas in deiner Wohnung', 'Auch wenn du "nicht zeichnen kannst" – 10 Minuten reichen.', 'kreativ', 'micro', false),
  ('Zufälliger Ort in deiner Stadt, hinlaufen', 'Ort per Zufallsgenerator (z.B. zufällige Koordinaten oder blind auf die Karte tippen) auswählen und zu Fuß hin.', 'koerperlich', 'micro', false),
  ('Fremdes Musikgenre + 3 Sätze dazu', 'Ein Musikstück in einem Genre hören, das du sonst nie hörst, danach 3 Sätze dazu schreiben.', 'kreativ', 'micro', false),
  ('Kaltduschen für eine Woche', 'Eine Woche lang kalt duschen testen.', 'koerperlich', 'micro', false),
  ('Einem alten Bekannten spontan schreiben', 'Jemandem, von dem du seit über einem Jahr nichts gehört hast, einfach eine Nachricht schicken.', 'sozial', 'micro', false),
  ('Eine Woche mit der anderen Hand', 'Zähneputzen oder Schreiben eine Woche lang mit der nicht dominanten Hand.', 'koerperlich', 'micro', false),
  ('Ein Gedicht auswendig lernen', 'Such dir eins aus, das dich berührt, und lern es Zeile für Zeile.', 'kreativ', 'micro', false),
  ('Einen Brief mit der Hand schreiben', 'Einen echten Brief schreiben und auch wirklich abschicken.', 'kreativ', 'micro', false),
  ('Etwas Kaputtes reparieren', 'Knopf, Reißverschluss, Kabel – reparieren statt wegwerfen.', 'handwerklich', 'micro', false),
  ('Einen Fremden nach einer Empfehlung fragen', 'Ein Buch, ein Café, ein Song – frag jemanden, den du nicht kennst.', 'sozial', 'micro', false),

  -- Nachmittags-/Abend-Format
  ('Escape Room oder Bouldern', 'Mit einem Freund verabreden.', 'sozial', 'afternoon', true),
  ('Töpfer-Workshop', 'Einmaliger Pottery-Schnupperkurs, viele Studios bieten das an.', 'handwerklich', 'afternoon', false),
  ('Improtheater-Schnupperstunde', 'Eine Schnupperstunde Improtheater besuchen.', 'sozial', 'afternoon', false),
  ('Schach- oder Poker-Abend im Club', 'Statt online: in einem Club vor Ort spielen.', 'sozial', 'afternoon', true),
  ('Konzert außerhalb deiner Bubble', 'Jazz, Techno, Klassik – je nachdem was dir fremd ist.', 'sozial', 'afternoon', true),
  ('Comedy-Show als Zuschauer', 'Eine Standup- oder Comedy-Show live anschauen.', 'sozial', 'afternoon', true),
  ('Lesung, Poetry Slam oder Science Slam', 'Einen Abend mit Worten auf der Bühne erleben.', 'sozial', 'afternoon', true),
  ('Tanzkurs-Schnupperstunde', 'Salsa, Swing oder Contact Improvisation – einfach ausprobieren.', 'koerperlich', 'afternoon', true),
  ('Allein ins Kino, Museum oder Restaurant', 'Bewusst allein unterwegs sein und es genießen.', 'sozial', 'afternoon', false),
  ('Eine fremde Sportart probieren', 'Fechten, Bogenschießen, Rudern oder Roller Derby – ein Probetraining.', 'koerperlich', 'afternoon', false),
  ('Druck- oder Schmiede-Workshop', 'Siebdruck, Linoldruck oder Schmieden in einem Schnupperkurs.', 'handwerklich', 'afternoon', false),
  ('Karaoke-Abend', 'Und mindestens einen Song selbst singen.', 'sozial', 'afternoon', true),
  ('Pub-Quiz', 'Als Team bei einem Kneipen-Quiz mitraten.', 'sozial', 'afternoon', true),
  ('Ehrenamt-Schnuppertag', 'Tafel, Tierheim oder Gemeinschaftsgarten – einen Tag mithelfen.', 'sozial', 'afternoon', false),
  ('Sonnenaufgang anschauen', 'Früh raus, draußen sein und den Sonnenaufgang bewusst erleben.', 'koerperlich', 'afternoon', false),
  ('Repair Café besuchen', 'Etwas Kaputtes mitbringen und gemeinsam reparieren.', 'handwerklich', 'afternoon', false),

  -- Über Wochen dranbleiben
  ('Neue Sprache anfangen', 'Duolingo + 1x/Woche Tandem.', 'kreativ', 'ongoing', false),
  ('Neues Instrument lernen', 'Ergänzt deine Musik-Arrangements gut.', 'kreativ', 'ongoing', false),
  ('30-Tage-Foto-Challenge', 'Mit täglichem Thema.', 'kreativ', 'ongoing', false),
  ('Handwerkliches Projekt', 'Holz, Leder oder Elektronik-Basteln.', 'handwerklich', 'ongoing', false),
  ('Lauf- oder Schwimm-Challenge', 'Mit konkretem Ziel, z.B. der erste 10km-Lauf.', 'koerperlich', 'ongoing', false),
  ('30 Tage Tagebuch', 'Jeden Tag ein paar Zeilen oder Morgenseiten schreiben.', 'kreativ', 'ongoing', false),
  ('Jede Woche ein neues Rezept', 'Einen Monat lang jede Woche etwas kochen, das du noch nie gemacht hast.', 'kreativ', 'ongoing', false),
  ('Ein Möbelstück bauen oder restaurieren', 'Von der Idee bis zum fertigen Stück.', 'handwerklich', 'ongoing', false),
  ('4 Wochen gemeinsam Sport', 'Mit einem Freund feste Termine ausmachen und durchziehen.', 'koerperlich', 'ongoing', true),
  ('Eine Kurzgeschichte oder einen Song fertigstellen', 'Nicht nur anfangen – wirklich zu Ende bringen.', 'kreativ', 'ongoing', false),
  ('Pflanzen aus Samen ziehen', 'Kräuter, Tomaten oder Blumen vom Samen bis zur Pflanze.', 'handwerklich', 'ongoing', false),

  -- Etwas mutiger / unangenehm-komisch
  ('Standup-Comedy-Open-Mic', 'Als Zuschauer oder sogar selbst auf der Bühne.', 'sozial', 'bold', false),
  ('Cold Approach', 'Eine fremde Person auf einer Veranstaltung ansprechen.', 'sozial', 'bold', false),
  ('Planlos ein Wochenende verreisen', 'Zug nehmen, erst am Bahnhof das Ziel entscheiden.', 'koerperlich', 'bold', false),
  ('Digital Detox Tag', 'Ein ganzer Tag ohne Handy.', 'koerperlich', 'bold', false),
  ('Eine Nacht draußen schlafen', 'Zelten oder Biwak – eine Nacht unter freiem Himmel.', 'koerperlich', 'bold', true),
  ('Einen Tag "Ja" sagen', 'Einen Tag lang zu jeder vernünftigen Einladung oder Idee Ja sagen.', 'sozial', 'bold', false),
  ('Für Freunde kochen, die sich nicht kennen', 'Leute aus verschiedenen Ecken deines Lebens an einen Tisch bringen.', 'sozial', 'bold', false),
  ('Öffentlich etwas vorführen', 'Ein Instrument, ein Vortrag oder eine Lesung vor Publikum.', 'kreativ', 'bold', false),
  ('Allein mehrere Tage wandern', 'Eine mehrtägige Wanderung nur mit dir selbst.', 'koerperlich', 'bold', false),
  ('Um einen Rabatt verhandeln', 'In einem Laden freundlich nach einem besseren Preis fragen.', 'sozial', 'bold', false),
  ('Einen Workshop selbst anbieten', 'Anderen etwas beibringen, das du kannst.', 'sozial', 'bold', false)
on conflict (title) do nothing;
