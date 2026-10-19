// lib/challenges.ts
import { supabase } from './supabase';
import { Challenge, ChallengeCategory, ChallengeSize, ChallengeStatus } from '../types/challenge';

// Reihenfolge, in der die Kategorien rotieren ("jeden Monat eine Kategorie").
export const CATEGORY_ROTATION: ChallengeCategory[] = ['koerperlich', 'kreativ', 'sozial', 'handwerklich'];

export const CATEGORY_LABEL: Record<ChallengeCategory, string> = {
  koerperlich: 'Körperlich',
  kreativ: 'Kreativ',
  sozial: 'Sozial',
  handwerklich: 'Handwerklich',
};

export const CATEGORY_EMOJI: Record<ChallengeCategory, string> = {
  koerperlich: '💪',
  kreativ: '🎨',
  sozial: '🤝',
  handwerklich: '🔨',
};

export const SIZE_ORDER: ChallengeSize[] = ['micro', 'afternoon', 'ongoing', 'bold'];

export const SIZE_LABEL: Record<ChallengeSize, string> = {
  micro: 'Micro-Challenge (< 30 Min)',
  afternoon: 'Nachmittag / Abend',
  ongoing: 'Über Wochen dranbleiben',
  bold: 'Mutig & unangenehm-komisch',
};

/** Rotiert die Kategorie alle 4 Kalendermonate durch die feste Reihenfolge. */
export function currentMonthCategory(date: Date = new Date()): ChallengeCategory {
  return CATEGORY_ROTATION[date.getMonth() % CATEGORY_ROTATION.length];
}

// Challenges lassen sich beliebig oft machen: `challenge_progress` hat eine Zeile
// pro Durchgang ('active' läuft, 'done' geschafft, 'open' abgebrochen).

/** Startet einen neuen Durchgang. */
export async function startChallenge(challengeId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const now = new Date().toISOString();
  return supabase.from('challenge_progress').insert({
    user_id: session?.user.id,
    challenge_id: challengeId,
    status: 'active' satisfies ChallengeStatus,
    started_at: now,
    updated_at: now,
  });
}

/** Schließt den laufenden Durchgang ab ('done') oder bricht ihn ab ('open'). */
export async function finishChallenge(challengeId: string, status: Exclude<ChallengeStatus, 'active'>) {
  const now = new Date().toISOString();
  return supabase
    .from('challenge_progress')
    .update({ status, updated_at: now, completed_at: status === 'done' ? now : null })
    .eq('challenge_id', challengeId)
    .eq('status', 'active');
}

/**
 * Wählt zufällig eine Challenge aus der übergebenen Kategorie, die gerade nicht
 * läuft — schon geschaffte sind genauso im Topf wie neue. Fällt auf alle
 * Kategorien zurück, falls in der Kategorie nichts frei ist.
 */
export function drawChallenge(
  challenges: Challenge[],
  isActive: (id: string) => boolean,
  category: ChallengeCategory
): Challenge | null {
  const free = (list: Challenge[]) => list.filter((c) => !isActive(c.id));
  const inCategory = free(challenges.filter((c) => c.category === category));
  const pool = inCategory.length > 0 ? inCategory : free(challenges);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
