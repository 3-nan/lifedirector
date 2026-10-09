// lib/dream-image.ts
// Automatische Traum-Fotos über die Edge Function `dream-image` (siehe
// ROADMAP.md, "Fotos (automatisch)"). Läuft still im Hintergrund: findet die
// Funktion nichts oder ist das Tageslimit erreicht, bleibt der Traum, wie er ist.
import { supabase } from './supabase';
import { refreshDreamWidgets } from './widget-bridge';

type Listener = (dreamId: string) => void;
const listeners = new Set<Listener>();

/** Screens melden sich hier an, um nach einem neuen Foto neu zu laden. */
export function onDreamImageChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** false, wenn die Funktion nicht erreichbar war oder abgelehnt hat (z.B. Tageslimit). */
async function invoke(body: { dream_id: string; action?: 'next' }): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('dream-image', { body });
    if (error) return false;
    if (data?.image) {
      listeners.forEach((l) => l(body.dream_id));
      refreshDreamWidgets(); // neues Foto auch auf dem Startbildschirm
    }
    return true;
  } catch {
    // Fotos sind ein Extra — nie die App wegen eines Foto-Fehlers stören.
    return false;
  }
}

/** Sucht ein passendes Foto für einen Traum (nach dem Anlegen; ein neuer Titel ändert das Foto nicht). */
export function fetchDreamImage(dreamId: string): Promise<boolean> {
  return invoke({ dream_id: dreamId });
}

/** Wie fetchDreamImage, aber ohne auf das Ergebnis zu warten. */
export function requestDreamImage(dreamId: string) {
  fetchDreamImage(dreamId);
}

let fetchingMissing = false;

/**
 * Holt Fotos für alle Träume nach, bei denen noch nie gesucht wurde
 * (`image_attempted` = false) — beim App-Start, nacheinander. Bricht beim
 * ersten Fehler ab (meist das Tageslimit); der Rest kommt beim nächsten Start dran.
 */
export async function fetchMissingDreamImages() {
  if (fetchingMissing) return;
  fetchingMissing = true;
  try {
    const { data } = await supabase
      .from('dreams')
      .select('id')
      .eq('image_attempted', false)
      .order('created_at', { ascending: true });
    for (const { id } of data ?? []) {
      if (!(await fetchDreamImage(id))) break;
    }
  } finally {
    fetchingMissing = false;
  }
}

/** "Anderes Bild": nächster gespeicherter Kandidat, ohne KI und Tageslimit. */
export function nextDreamImage(dreamId: string) {
  return invoke({ dream_id: dreamId, action: 'next' });
}

/** Hex-Farbe (#rrggbb) mit Deckkraft, für das Text-Panel über dem Foto. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Deckkraft des Text-Panels auf Foto-Karten (Mockup: 88 %). */
export const PHOTO_PANEL_ALPHA = 0.88;
