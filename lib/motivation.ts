// lib/motivation.ts
// Phase 2: Fortschritt sichtbar & emotional belohnend machen, statt stummem
// Abhaken. Siehe ROADMAP.md.

import type { ChallengeSize } from '../types/challenge';

export type LogEntry = { date: string; done: boolean };

export const MILESTONES = [3, 7, 30, 100] as const;
export type Milestone = (typeof MILESTONES)[number];

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, delta: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + delta);
  return copy;
}

/**
 * Klassischer, strenger Streak (aufeinanderfolgende erledigte Tage).
 * "Heute" zählt nur mit, wenn es schon abgehakt ist — ist es das nicht,
 * bricht das den Streak noch nicht (der Tag ist ja noch nicht vorbei).
 */
export function computeStreak(doneDates: Set<string>, today: Date = new Date()): number {
  const todayKey = dateStr(today);
  let cursor = doneDates.has(todayKey) ? today : addDays(today, -1);
  let streak = 0;
  while (doneDates.has(dateStr(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Liefert den überschrittenen Meilenstein, falls `newStreak` erstmals einen erreicht. */
export function hitMilestone(oldStreak: number, newStreak: number): Milestone | null {
  const hit = MILESTONES.find((m) => oldStreak < m && newStreak >= m);
  return hit ?? null;
}

const MOMENTUM_GAIN = 14;
const MOMENTUM_LOSS = 7; // bewusst < GAIN: ein verpasster Tag wiegt weniger als ein guter Tag zählt
const MOMENTUM_WINDOW_DAYS = 60;
const MOMENTUM_CAP = 100;

/**
 * "Fortschritt statt Perfektion": ein 0–100-Score statt eines harten
 * Streak-Resets. Steigt bei jedem erledigten Tag, sinkt bei einem
 * verpassten Tag nur sanft — ein einzelner schlechter Tag wirft dich
 * nicht auf null zurück.
 */
export function computeMomentum(
  doneDates: Set<string>,
  habitCreatedAt: Date,
  today: Date = new Date()
): number {
  const windowStart = addDays(today, -MOMENTUM_WINDOW_DAYS);
  const start = habitCreatedAt > windowStart ? habitCreatedAt : windowStart;

  let score = 0;
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const yesterday = addDays(today, -1);

  while (cursor <= yesterday) {
    const key = dateStr(cursor);
    if (doneDates.has(key)) {
      score = Math.min(MOMENTUM_CAP, score + MOMENTUM_GAIN);
    } else {
      score = Math.max(0, score - MOMENTUM_LOSS);
    }
    cursor = addDays(cursor, 1);
  }
  // Heutiges Abhaken zählt sofort mit, damit der Score beim Antippen direkt reagiert.
  if (doneDates.has(dateStr(today))) {
    score = Math.min(MOMENTUM_CAP, score + MOMENTUM_GAIN);
  }
  return Math.round(score);
}

/** Montag (UTC) der ISO-Woche, in der `d` liegt — gleiche Wochen wie `isoWeekKey`. */
function mondayOf(d: Date): Date {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return addDays(day, -((day.getUTCDay() + 6) % 7));
}

function countInWeek(doneDates: Set<string>, monday: Date): number {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (doneDates.has(dateStr(addDays(monday, i)))) count += 1;
  }
  return count;
}

/** Wie oft der Habit in der laufenden Woche (Mo–So) schon erledigt wurde. */
export function doneThisWeek(doneDates: Set<string>, today: Date = new Date()): number {
  return countInWeek(doneDates, mondayOf(today));
}

/**
 * Streak für Habits mit Wochenziel (1–6× pro Woche): aufeinanderfolgende
 * Wochen, in denen das Ziel erreicht wurde. Die laufende Woche zählt nur
 * mit, wenn das Ziel schon erreicht ist — sonst bricht sie den Streak noch
 * nicht (die Woche ist ja noch nicht vorbei).
 */
export function computeWeekStreak(doneDates: Set<string>, target: number, today: Date = new Date()): number {
  let monday = mondayOf(today);
  if (countInWeek(doneDates, monday) < target) monday = addDays(monday, -7);
  let streak = 0;
  while (countInWeek(doneDates, monday) >= target) {
    streak += 1;
    monday = addDays(monday, -7);
  }
  return streak;
}

const WEEK_MOMENTUM_GAIN = 30;
const WEEK_MOMENTUM_LOSS = 15; // wie bei Tagen: eine verpasste Woche wiegt weniger als eine geschaffte

/**
 * Momentum für Habits mit Wochenziel: pro Woche statt pro Tag. Eine knapp
 * verpasste Woche (2 von 3) kostet anteilig weniger als eine leere.
 */
export function computeWeekMomentum(
  doneDates: Set<string>,
  target: number,
  habitCreatedAt: Date,
  today: Date = new Date()
): number {
  const windowStart = addDays(today, -MOMENTUM_WINDOW_DAYS);
  const thisWeek = mondayOf(today);
  let monday = mondayOf(habitCreatedAt > windowStart ? habitCreatedAt : windowStart);

  let score = 0;
  while (monday < thisWeek) {
    const ratio = Math.min(1, countInWeek(doneDates, monday) / target);
    score = ratio >= 1
      ? Math.min(MOMENTUM_CAP, score + WEEK_MOMENTUM_GAIN)
      : Math.max(0, score - WEEK_MOMENTUM_LOSS * (1 - ratio));
    monday = addDays(monday, 7);
  }
  if (countInWeek(doneDates, thisWeek) >= target) {
    score = Math.min(MOMENTUM_CAP, score + WEEK_MOMENTUM_GAIN);
  }
  return Math.round(score);
}

/** Kurzer, weicher Hinweistext statt "Streak: 0", wenn gerade kein aktiver Streak läuft. */
export function momentumNote(streak: number, momentum: number, unit: 'day' | 'week' = 'day'): string | null {
  if (streak > 0) return null;
  if (momentum >= 60) return unit === 'day'
    ? 'Fast dran — ein Tag verpasst, Momentum bleibt'
    : 'Fast dran — eine Woche verpasst, Momentum bleibt';
  if (momentum >= 25) return 'Noch im Fluss, auch nach der Pause';
  return null;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Deterministisch pro Tag, aber über die Tage hinweg variiert — kein "Gut gemacht"-Einerlei. */
function pickForDay(pool: readonly string[], seed: string): string {
  const index = hashString(seed) % pool.length;
  return pool[index];
}

const CELEBRATION_LINES: Record<Milestone, readonly string[]> = {
  3: [
    'Drei Tage am Stück — der Anfang einer Gewohnheit.',
    '3 Tage. Du wirst gerade zu jemandem, der dranbleibt.',
    'Kleiner Lauf, echter Start: 3 Tage in Folge.',
  ],
  7: [
    'Eine ganze Woche durchgehalten. Das ist keine Ausnahme mehr.',
    '7 Tage — du wirst zur Person, die das einfach macht.',
    'Eine Woche Streak. So entstehen Identitäten, nicht nur Haken.',
  ],
  30: [
    '30 Tage. Das ist kein Vorsatz mehr, das bist du.',
    'Ein Monat dran geblieben — das zählt zu den seltenen Dingen.',
    '30 Tage Streak: der Beweis, dass es kein Zufall war.',
  ],
  100: [
    '100 Tage. Das hier ist jetzt einfach, wer du bist.',
    'Dreistellig. Die meisten Vorsätze schaffen das nie.',
    '100 Tage in Folge — das trägt dich auch durch schlechte Tage.',
  ],
};

export function celebrationLine(milestone: Milestone, habitName: string, seed: string): string {
  const line = pickForDay(CELEBRATION_LINES[milestone], seed + milestone);
  return line.includes(habitName) ? line : `${habitName}: ${line}`;
}

const DAILY_MESSAGES_EMPTY = [
  'Noch nichts abgehakt — ein einziger Schritt reicht für den Start heute.',
  'Der Tag ist offen. Du entscheidest, wer du heute wirst.',
  'Noch Zeit für den ersten Haken heute.',
] as const;

const DAILY_MESSAGES_PARTIAL = [
  'Schon unterwegs heute — mach einfach beim nächsten weiter.',
  'Ein paar stehen schon. Du wirst gerade zu jemandem, der dranbleibt.',
  'Guter Anfang heute. Der Rest läuft von allein mit.',
] as const;

const DAILY_MESSAGES_DONE = [
  'Alles erledigt. Das war die Version von dir, die du sein willst.',
  'Heute komplett durch — nicht schlecht für einen normalen Tag.',
  'Fertig für heute. Genau so wird aus Vorsatz Identität.',
] as const;

/** Variierte, identitäts-geframte Tageszusammenfassung statt generischem Lob. */
export function dailyEncouragement(doneCount: number, total: number, seed: string): string {
  if (total === 0) return 'Leg oben deinen ersten Habit an, dann geht es los.';
  if (doneCount === 0) return pickForDay(DAILY_MESSAGES_EMPTY, seed);
  if (doneCount >= total) return pickForDay(DAILY_MESSAGES_DONE, seed);
  return pickForDay(DAILY_MESSAGES_PARTIAL, seed);
}

const NOTIFICATION_HIGH = [
  'Du bist bei {pct}% deiner Woche — richtig stark dabei.',
  '{pct}% diese Woche schon. Weiter so, das trägt.',
] as const;
const NOTIFICATION_MID = [
  'Du bist bei {pct}% deiner Woche — noch ist Luft nach oben.',
  '{pct}% diese Woche. Ein Haken heute bringt dich weiter.',
] as const;
const NOTIFICATION_LOW = [
  'Diese Woche ist noch offen — ein kleiner Schritt reicht für den Anfang.',
  'Noch nicht viel diese Woche. Heute ist ein guter Tag für den ersten Schritt.',
] as const;

/** Ermutigend statt mahnend formuliert — kein "Vergiss nicht X". */
export function notificationCopy(weeklyRate: number, seed: string): { title: string; body: string } {
  const pct = Math.round(weeklyRate * 100);
  const pool = pct >= 70 ? NOTIFICATION_HIGH : pct >= 35 ? NOTIFICATION_MID : NOTIFICATION_LOW;
  const body = pickForDay(pool, seed).replace('{pct}', String(pct));
  return { title: 'LifeDirector', body };
}

const FIRST_WEEK_MESSAGES = [
  'Du baust gerade erst den Rhythmus auf — nach einer vollen Woche zeigen sich hier echte Muster.',
  'Noch sammelst du Daten, keine Urteile. Die erste Woche zählt nicht gegen dich.',
  'Deine erste Woche läuft gerade erst. Lass die Zahlen wachsen, bevor du sie bewertest.',
] as const;

/**
 * Ersetzt "schwächster Tag/Habit" in den ersten 7 Tagen seit Anlage: mit so
 * wenig Historie wäre jeder Tag vor dem Start fälschlich als "verpasst"
 * gezählt worden — das ist kein echtes Muster, sondern nur fehlende Daten.
 */
export function firstWeekMessage(seed: string): string {
  return pickForDay(FIRST_WEEK_MESSAGES, seed);
}

const CHALLENGE_LINES: Record<ChallengeSize, readonly string[]> = {
  micro: [
    'Klein, aber gemacht. So wächst die Komfortzone — Schritt für Schritt.',
    'Kurz raus aus der Routine und wieder rein. Genau so fängt es an.',
    'Erledigt statt aufgeschoben. Du bist jemand, der Dinge einfach ausprobiert.',
  ],
  afternoon: [
    'Einen ganzen Nachmittag in etwas Neues gesteckt — das bleibt hängen.',
    'Zeit investiert, Erfahrung gewonnen. Du wirst zur Person, die Neues anpackt.',
    'Nicht nur geplant, sondern durchgezogen. Stark.',
  ],
  ongoing: [
    'Über Wochen drangeblieben — das ist die Königsdisziplin.',
    'Durchgehalten, als der Reiz des Neuen weg war. Das zählt doppelt.',
    'Langer Atem bewiesen. Du bringst zu Ende, was du anfängst.',
  ],
  bold: [
    'Mutig gewesen, obwohl es unangenehm war. Genau dafür ist das hier da.',
    'Du hast dich getraut. Die Komfortzone ist gerade ein Stück größer geworden.',
    'Unangenehm, gemacht, überlebt. Das nimmt dir keiner mehr.',
  ],
};

/** Identitäts-geframter Satz beim Abschluss einer Challenge, abgestimmt auf ihre Größe. */
export function challengeCompleteLine(size: ChallengeSize, seed: string): string {
  return pickForDay(CHALLENGE_LINES[size], seed);
}

const WEEK_GOAL_LINES = [
  'Genau so oft, wie du es dir vorgenommen hast. Ziel erreicht, ohne dich zu verbiegen.',
  'Wochenziel steht. Du wirst zur Person, die ihren eigenen Plan einhält.',
  'Geschafft für diese Woche — der Rest ist Bonus, nicht Pflicht.',
] as const;

/** Satz beim Erreichen des Wochenziels eines 1–6×-Habits, mit Wochen-Streak ab der 2. Woche. */
export function weekGoalLine(habitName: string, weekStreak: number, seed: string): string {
  const line = pickForDay(WEEK_GOAL_LINES, seed);
  const streakPart = weekStreak >= 2 ? ` ${weekStreak}. Woche in Folge.` : '';
  return `${habitName}: ${line}${streakPart}`;
}

const DREAM_STEP_LINES = [
  'Ein Schritt näher. Träume werden genau so wahr — nicht auf einmal, sondern Schritt für Schritt.',
  'Nicht nur geträumt, sondern etwas dafür getan. Das unterscheidet Wünsche von Plänen.',
  'Kleiner Schritt, echte Bewegung. Du bist jemand, der seine Träume ernst nimmt.',
] as const;

/** Satz, wenn ein Schritt zu einem Traum erledigt wurde. */
export function dreamStepLine(dreamTitle: string, seed: string): string {
  return `${dreamTitle}: ${pickForDay(DREAM_STEP_LINES, seed)}`;
}

const STAGE_UP_LINES: Record<'explored' | 'planned' | 'committed' | 'fulfilled', readonly string[]> = {
  explored: [
    'Du weißt jetzt mehr als gestern. Aus einem vagen Wunsch wird ein Bild.',
    'Erkundet. Der Traum hat jetzt Konturen.',
  ],
  planned: [
    'Es gibt einen Plan. Ab hier ist es nur noch eine Frage des Wann.',
    'Geplant. Du hast aus "irgendwann" ein "so geht es" gemacht.',
  ],
  committed: [
    'Angemeldet ist angemeldet. Ab jetzt ist es kein Traum mehr, sondern ein Termin.',
    'Fest zugesagt — der mutigste Schritt ist gemacht.',
  ],
  fulfilled: [
    'Du hast es wirklich getan. Das nimmt dir niemand mehr.',
    'Erfüllt. Aus einem Traum ist eine Erinnerung geworden.',
  ],
};

export function stageUpLine(stage: 'explored' | 'planned' | 'committed' | 'fulfilled', seed: string): string {
  return pickForDay(STAGE_UP_LINES[stage], seed);
}
