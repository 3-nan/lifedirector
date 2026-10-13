// lib/habits.ts
import { Habit } from '../types/habit';
import { supabase } from './supabase';

/** `target_per_week` von 7 bedeutet "täglich". */
export const DAILY_TARGET = 7;

/** Reihenfolge der Auswahl-Chips: erst täglich, dann 1–6× pro Woche. */
export const FREQUENCY_OPTIONS = [DAILY_TARGET, 1, 2, 3, 4, 5, 6] as const;

/** Fällt auf täglich zurück, solange `habit_frequency.sql` noch nicht ausgeführt wurde. */
export function targetOf(habit: Habit): number {
  return habit.target_per_week ?? DAILY_TARGET;
}

export function isDaily(target: number): boolean {
  return target >= DAILY_TARGET;
}

export function frequencyChipLabel(target: number): string {
  return isDaily(target) ? 'Täglich' : `${target}×`;
}

export function frequencyLabel(target: number): string {
  return isDaily(target) ? 'Täglich' : `${target}× pro Woche`;
}

/** Auswahl beim Anlegen/Bearbeiten — wird in `habits.icon` gespeichert. */
export const HABIT_EMOJIS = [
  '✨', '💧', '🏃', '🏋️', '🧘', '📖', '✍️', '🥗', '🍎', '😴', '📵', '🚶',
  '🚴', '🧹', '🎸', '🎨', '🗣️', '🇪🇸', '💊', '🦷', '🌿', '🙏', '💰', '❤️',
];

export function habitEmoji(habit: Habit): string {
  return habit.icon || HABIT_EMOJIS[0];
}

export type HabitColor = { bg: string; accent: string; text: string };

// Hell (Kachel), kräftig (Punkte/Balken), dunkel (Text auf `bg`).
const HABIT_COLORS: HabitColor[] = [
  { bg: '#e3f7e8', accent: '#34c759', text: '#1f7a35' },
  { bg: '#e5f0ff', accent: '#007aff', text: '#0058c4' },
  { bg: '#f3eafd', accent: '#af52de', text: '#8944ab' },
  { bg: '#fff0e0', accent: '#f08a24', text: '#b25900' },
  { bg: '#fdeaf1', accent: '#e5487f', text: '#c2185b' },
  { bg: '#e3f6f5', accent: '#14b8a6', text: '#00857a' },
];

/** Feste Farbe pro Habit, aus der ID abgeleitet — keine DB-Spalte nötig. */
export function habitColor(habit: Pick<Habit, 'id'>): HabitColor {
  let hash = 0;
  for (let i = 0; i < habit.id.length; i++) hash = (hash * 31 + habit.id.charCodeAt(i)) >>> 0;
  return HABIT_COLORS[hash % HABIT_COLORS.length];
}

const STAGE_GROWING = 10;
/** ~66 Tage, bis eine Gewohnheit sich automatisch anfühlt (Lally et al. 2010). */
export const STAGE_FIRM = 66;

export type HabitStage = { emoji: string; label: string; progress: number };

/** Wachstumsstufe nach Anzahl Haken insgesamt: Keimt → Wächst → Gefestigt. */
export function habitStage(total: number): HabitStage {
  if (total < STAGE_GROWING) return { emoji: '🌱', label: 'Keimt', progress: total / STAGE_GROWING };
  if (total < STAGE_FIRM) {
    return { emoji: '🌿', label: 'Wächst', progress: (total - STAGE_GROWING) / (STAGE_FIRM - STAGE_GROWING) };
  }
  return { emoji: '🌳', label: 'Gefestigt', progress: 1 };
}

export type DoneLog = { habit_id: string; date: string };

const PAGE = 1000; // Supabase liefert höchstens 1000 Zeilen pro Abfrage

/** Alle erledigten Logs (auch über 1000), im Format für `cached()`. */
export async function fetchDoneLogs(): Promise<{ data: DoneLog[] | null; error: unknown }> {
  const all: DoneLog[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('logs').select('habit_id, date').eq('done', true).order('id').range(from, from + PAGE - 1);
    if (error) return { data: null, error };
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) return { data: all, error: null };
  }
}

/** Erledigte Tage pro Habit. */
export function doneDatesByHabit(logs: DoneLog[]): Record<string, Set<string>> {
  const map: Record<string, Set<string>> = {};
  for (const l of logs) (map[l.habit_id] ??= new Set()).add(l.date);
  return map;
}
