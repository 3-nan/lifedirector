// lib/habits.ts
import { Habit } from '../types/habit';

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
