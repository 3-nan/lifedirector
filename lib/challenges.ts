// lib/challenges.ts
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

/** Zyklus open -> active -> done -> open, für den manuellen Status-Toggle in der Liste. */
export function nextStatus(current: ChallengeStatus): ChallengeStatus {
  if (current === 'open') return 'active';
  if (current === 'active') return 'done';
  return 'open';
}

/**
 * Wählt zufällig eine offene Challenge aus der übergebenen Kategorie.
 * Fällt auf alle offenen Challenges zurück, falls die Kategorie leer ist.
 */
export function drawChallenge(
  challenges: Challenge[],
  statusOf: (id: string) => ChallengeStatus,
  category: ChallengeCategory
): Challenge | null {
  const open = (list: Challenge[]) => list.filter((c) => statusOf(c.id) === 'open');
  const inCategory = open(challenges.filter((c) => c.category === category));
  const pool = inCategory.length > 0 ? inCategory : open(challenges);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
