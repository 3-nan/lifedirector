import { describe, expect, it, vi } from 'vitest';
import type { Habit } from '../types/habit';
import {
  allTime, defaultMonthOffset, defaultWeekOffset, maxMonthOffset, monthReview, weekReview, type ReviewData,
} from './review';

// review.ts zieht über habits.ts/challenges.ts den Supabase-Client mit.
vi.mock('./supabase', () => ({ supabase: {} }));

// Donnerstag, 15.10.2026 (KW 42).
const TODAY = new Date('2026-10-15T12:00:00Z');
const day = (d: string) => new Date(`${d}T12:00:00Z`);

function habit(id: string, target = 7, created = '2026-09-01'): Habit {
  return { id, name: id, icon: null, active: true, target_per_week: target, created_at: `${created}T08:00:00Z` };
}

function data(habits: Habit[], doneDates: Record<string, string[]>, extra: Partial<ReviewData> = {}): ReviewData {
  return {
    habits,
    doneDates: Object.fromEntries(Object.entries(doneDates).map(([id, d]) => [id, new Set(d)])),
    tasks: [],
    goals: [],
    challenges: [],
    steps: [],
    dreams: [],
    chores: [],
    ...extra,
  };
}

describe('Standard-Zeitraum', () => {
  it('Mo/Di zeigt die letzte Woche, sonst die laufende', () => {
    expect(defaultWeekOffset(day('2026-10-12'))).toBe(1);
    expect(defaultWeekOffset(day('2026-10-13'))).toBe(1);
    expect(defaultWeekOffset(day('2026-10-14'))).toBe(0);
    expect(defaultWeekOffset(day('2026-10-18'))).toBe(0);
  });

  it('in den ersten 5 Tagen den Vormonat', () => {
    expect(defaultMonthOffset(new Date(2026, 9, 5))).toBe(1);
    expect(defaultMonthOffset(new Date(2026, 9, 6))).toBe(0);
  });

  it('maxMonthOffset über den Jahreswechsel', () => {
    expect(maxMonthOffset(new Date(2025, 11, 20), new Date(2026, 9, 15))).toBe(10);
  });
});

describe('weekReview', () => {
  const daily = habit('Lesen');
  const thrice = habit('Laufen', 3);

  it('Kopf, Tage und Serie der laufenden Woche', () => {
    const r = weekReview(data([daily], { Lesen: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'] }), 0, false, TODAY);
    expect(r.title).toBe('KW 42');
    expect(r.range).toBe('12.–18. Oktober');
    expect(r.total).toBe(4);
    expect(r.headline.title).toBe('Starke Woche.');
    expect(r.days.map((d) => d.perfect)).toEqual([true, true, true, true, false, false, false]);
    expect(r.days.map((d) => d.future)).toEqual([false, false, false, false, true, true, true]);
    expect(r.wins.map((w) => w.title)).toEqual(['Lesen: 4 Tage am Stück', '4 perfekte Tage']);
  });

  it('Zeitraum über eine Monatsgrenze', () => {
    expect(weekReview(data([], {}), 2, false, TODAY).range).toBe('28. September – 4. Oktober');
  });

  it('vergleicht mit der Vorwoche nur, wenn es besser war', () => {
    const better = weekReview(data([daily], { Lesen: ['2026-10-05', '2026-10-12', '2026-10-13'] }), 0, false, TODAY);
    expect(better.improvement).toEqual({ diff: 1, previousTitle: 'KW 41' });
    const worse = weekReview(data([daily], { Lesen: ['2026-10-05', '2026-10-06', '2026-10-12'] }), 0, false, TODAY);
    expect(worse.improvement).toBeNull();
  });

  it('feiert erreichte Wochenziele, 1–6×-Habits machen keinen Tag unperfekt', () => {
    const r = weekReview(data([thrice], { Laufen: ['2026-10-12', '2026-10-13', '2026-10-14'] }), 0, false, TODAY);
    expect(r.wins[0]).toMatchObject({ emoji: '🎯', title: 'Laufen: Wochenziel erreicht', sub: '3 von 3' });
    expect(r.days.some((d) => d.perfect)).toBe(false);
  });

  it('zählt erledigte Wochen-Tasks der richtigen KW', () => {
    const task = (id: string, week_key: string) => ({ id, category: null, dream_id: null, week_key, completed_at: null });
    const r = weekReview(data([], {}, { tasks: [task('a', '2026-W42'), task('b', '2026-W42'), task('c', '2026-W41')] }), 0, false, TODAY);
    expect(r.wins.map((w) => w.title)).toEqual(['2 Wochen-Tasks erledigt']);
  });

  describe('Tipp', () => {
    it('schlägt für die abgeschlossene Woche ein kleineres Ziel vor', () => {
      const r = weekReview(data([thrice], { Laufen: ['2026-10-07'] }), 1, false, TODAY);
      expect(r.tip).toMatchObject({ id: 'Laufen:2026-10-05', suggested: 1 });
    });

    it('nach einer Pause erst mal 1×', () => {
      const r = weekReview(data([thrice], { Laufen: [] }), 1, false, TODAY);
      expect(r.tip?.suggested).toBe(1);
      expect(r.tip?.text).toMatch(/Pause/);
    });

    it('nicht in der ersten Woche, nicht für die laufende, nicht ab 50 %', () => {
      expect(weekReview(data([thrice], { Laufen: [] }), 1, true, TODAY).tip).toBeNull();
      expect(weekReview(data([thrice], { Laufen: [] }), 0, false, TODAY).tip).toBeNull();
      expect(weekReview(data([thrice], { Laufen: ['2026-10-05', '2026-10-07'] }), 1, false, TODAY).tip).toBeNull();
    });
  });
});

describe('monthReview', () => {
  const twice = habit('Yoga', 2);

  it('zählt Wochen, deren Donnerstag im Monat liegt; laufende Woche erst mit erreichtem Ziel', () => {
    // KW 40 (28.9.–4.10.) gehört zum Oktober, weil Do = 1.10.
    const r = monthReview(data([twice], { Yoga: ['2026-09-29', '2026-10-01', '2026-10-06', '2026-10-08', '2026-10-13'] }), 0, TODAY);
    expect(r.title).toBe('Oktober');
    expect(r.habits).toHaveLength(1);
    expect(r.habits[0]).toMatchObject({ met: 2, counted: 2, checkOffs: 4, onTrack: true, weeks: [1, 1, 0.5] });
    expect(r.headline).toEqual({ title: 'Der Monat läuft.', text: '1 Gewohnheit jede Woche auf Kurs.' });
  });

  it('Habits ohne Haken im Monat tauchen nicht auf', () => {
    const r = monthReview(data([twice], { Yoga: ['2026-09-10'] }), 0, TODAY);
    expect(r.habits).toEqual([]);
    expect(r.headline.title).toBe('Der Monat ist noch offen.');
  });

  it('Titel mit Jahr nur für andere Jahre', () => {
    expect(monthReview(data([], {}), 1, TODAY).title).toBe('September');
    expect(monthReview(data([], {}), 10, TODAY).title).toBe('Dezember 2025');
  });

  it('erledigte Monatsziele zuerst', () => {
    const goal = (id: string, done: boolean, month_key = '2026-10') =>
      ({ id, title: id, month_key, done, completed_at: null, created_at: '2026-10-01T00:00:00Z' });
    const r = monthReview(data([], {}, { goals: [goal('a', false), goal('b', true), goal('c', true, '2026-09')] }), 0, TODAY);
    expect(r.goals.map((g) => g.id)).toEqual(['b', 'a']);
    expect(r.headline.text).toBe('1 Monatsziel geschafft.');
  });
});

describe('allTime', () => {
  it('schaltet Abzeichen aus der Historie frei, freigeschaltete zuerst', () => {
    const dates = Array.from({ length: 7 }, (_, i) => `2026-10-0${i + 1}`);
    const r = allTime(data([habit('Lesen')], { Lesen: dates }), TODAY);
    expect(r.checkOffs).toBe(7);
    expect(r.badges.filter((b) => b.unlocked).map((b) => b.label)).toEqual(['Erster Haken', '7 Tage am Stück']);
    expect(r.badges[2].unlocked).toBe(false);
  });
});
