-- Seed data. Run supabase/schema.sql first to create the tables and policies.
-- Safe to re-run: existing challenge titles are left unchanged.

insert into challenges (title, description, category, size, friend_friendly) values
  -- Micro-Challenges (unter 30 Min, sofort startbar)
  ('Ein Gericht aus einer fremden Küche kochen', 'Wähl eine Küche, die du noch nie gekocht hast, und mach dich an ein Gericht daraus.', 'kreativ', 'micro', false),
  ('Skizze von etwas in deiner Wohnung', 'Auch wenn du "nicht zeichnen kannst" – 10 Minuten reichen.', 'kreativ', 'micro', false),
  ('Zufälliger Ort in Berlin, hinlaufen', 'Ort per Zufallsgenerator (z.B. zufällige Koordinaten oder blind auf die Karte tippen) auswählen und zu Fuß hin.', 'koerperlich', 'micro', false),
  ('Fremdes Musikgenre + 3 Sätze dazu', 'Ein Musikstück in einem Genre hören, das du sonst nie hörst, danach 3 Sätze dazu schreiben.', 'kreativ', 'micro', false),
  ('Kaltduschen für eine Woche', 'Eine Woche lang kalt duschen testen.', 'koerperlich', 'micro', false),

  -- Nachmittags-/Abend-Format
  ('Escape Room oder Bouldern', 'Mit einem Freund verabreden.', 'sozial', 'afternoon', true),
  ('Töpfer-Workshop', 'Einmaliger Pottery-Schnupperkurs, viele Studios in Berlin bieten das an.', 'handwerklich', 'afternoon', false),
  ('Improtheater-Schnupperstunde', 'Eine Schnupperstunde Improtheater besuchen.', 'sozial', 'afternoon', false),
  ('Schach- oder Poker-Abend im Club', 'Statt online: in einem Club vor Ort spielen.', 'sozial', 'afternoon', true),
  ('Konzert außerhalb deiner Bubble', 'Jazz, Techno, Klassik – je nachdem was dir fremd ist.', 'sozial', 'afternoon', true),

  -- Über Wochen dranbleiben
  ('Neue Sprache anfangen', 'Duolingo + 1x/Woche Tandem.', 'kreativ', 'ongoing', false),
  ('Neues Instrument lernen', 'Ergänzt deine Musik-Arrangements gut.', 'kreativ', 'ongoing', false),
  ('30-Tage-Foto-Challenge', 'Mit täglichem Thema.', 'kreativ', 'ongoing', false),
  ('Handwerkliches Projekt', 'Holz, Leder oder Elektronik-Basteln.', 'handwerklich', 'ongoing', false),
  ('Lauf- oder Schwimm-Challenge', 'Mit konkretem Ziel, z.B. der erste 10km-Lauf.', 'koerperlich', 'ongoing', false),

  -- Etwas mutiger / unangenehm-komisch
  ('Standup-Comedy-Open-Mic', 'Als Zuschauer oder sogar selbst auf der Bühne.', 'sozial', 'bold', false),
  ('Cold Approach', 'Eine fremde Person auf einer Veranstaltung ansprechen.', 'sozial', 'bold', false),
  ('Planlos ein Wochenende verreisen', 'Zug nehmen, erst am Bahnhof das Ziel entscheiden.', 'koerperlich', 'bold', false),
  ('Digital Detox Tag', 'Ein ganzer Tag ohne Handy.', 'koerperlich', 'bold', false)
on conflict (title) do nothing;
