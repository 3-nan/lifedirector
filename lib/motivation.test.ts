import { describe, expect, it } from 'vitest';
import {
  bestStreak, computeMomentum, computeStreak, computeWeekMomentum, computeWeekStreak, dailyEncouragement,
  doneThisWeek, hitMilestone, joinGerman, mondayOf, weekHeadline,
} from './motivation';

// Donnerstag, 15.10.2026 (KW 42, Montag = 12.10.).
const TODAY = new Date('2026-10-15T12:00:00Z');
const day = (d: string) => new Date(`${d}T12:00:00Z`);
const set = (...dates: string[]) => new Set(dates);

describe('computeStreak', () => {
  it('zählt heute mit, wenn schon abgehakt', () => {
    expect(computeStreak(set('2026-10-13', '2026-10-14', '2026-10-15'), TODAY)).toBe(3);
  });

  it('bricht nicht ab, nur weil heute noch offen ist', () => {
    expect(computeStreak(set('2026-10-13', '2026-10-14'), TODAY)).toBe(2);
  });

  it('endet an der ersten Lücke', () => {
    expect(computeStreak(set('2026-10-12', '2026-10-14'), TODAY)).toBe(1);
    expect(computeStreak(set('2026-10-12', '2026-10-13'), TODAY)).toBe(0);
  });

  it('läuft über Monatsgrenzen', () => {
    expect(computeStreak(set('2026-09-30', '2026-10-01'), day('2026-10-01'))).toBe(2);
  });
});

describe('hitMilestone', () => {
  it('meldet einen Meilenstein nur beim Überschreiten', () => {
    expect(hitMilestone(2, 3)).toBe(3);
    expect(hitMilestone(3, 4)).toBeNull();
    expect(hitMilestone(6, 8)).toBe(7);
    expect(hitMilestone(99, 100)).toBe(100);
  });
});

describe('computeMomentum', () => {
  it('sinkt bei verpassten Tagen langsamer, als er steigt', () => {
    // 3 erledigt (+14 je) = 42, dann 2 verpasst (−7 je) = 28.
    const done = set('2026-10-10', '2026-10-11', '2026-10-12');
    expect(computeMomentum(done, day('2026-10-10'), TODAY)).toBe(28);
  });

  it('zählt heutiges Abhaken sofort mit', () => {
    expect(computeMomentum(set('2026-10-15'), day('2026-10-15'), TODAY)).toBe(14);
  });

  it('bleibt zwischen 0 und 100', () => {
    const all = new Set<string>();
    for (let i = 0; i < 60; i++) all.add(new Date(TODAY.getTime() - i * 86400000).toISOString().slice(0, 10));
    expect(computeMomentum(all, day('2026-01-01'), TODAY)).toBe(100);
    expect(computeMomentum(set(), day('2026-01-01'), TODAY)).toBe(0);
  });
});

describe('Wochen', () => {
  it('mondayOf liefert den Montag der ISO-Woche', () => {
    expect(mondayOf(day('2026-10-12')).toISOString().slice(0, 10)).toBe('2026-10-12');
    expect(mondayOf(day('2026-10-18')).toISOString().slice(0, 10)).toBe('2026-10-12');
  });

  it('doneThisWeek zählt nur Mo–So der laufenden Woche', () => {
    expect(doneThisWeek(set('2026-10-11', '2026-10-12', '2026-10-14'), TODAY)).toBe(2);
  });

  it('computeWeekStreak: laufende Woche zählt erst, wenn das Ziel steht', () => {
    const past = ['2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09'];
    expect(computeWeekStreak(set(...past, '2026-10-12'), 3, TODAY)).toBe(2);
    expect(computeWeekStreak(set(...past, '2026-10-12', '2026-10-13', '2026-10-14'), 3, TODAY)).toBe(3);
  });

  it('computeWeekMomentum: knapp verpasste Woche kostet nur anteilig', () => {
    // KW 40: 2/2 → +30; KW 41: 1/2 → −7,5; laufende Woche ohne Haken zählt nicht.
    const done = set('2026-09-29', '2026-10-01', '2026-10-06');
    expect(computeWeekMomentum(done, 2, day('2026-09-28'), TODAY)).toBe(23);
  });
});

describe('bestStreak', () => {
  it('findet den längsten Lauf', () => {
    expect(bestStreak(set('2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11'))).toBe(3);
    expect(bestStreak(set('2026-09-30', '2026-10-01'))).toBe(2);
    expect(bestStreak(set())).toBe(0);
  });
});

describe('Texte', () => {
  it('joinGerman', () => {
    expect(joinGerman([])).toBe('');
    expect(joinGerman(['A'])).toBe('A');
    expect(joinGerman(['A', 'B', 'C'])).toBe('A, B und C');
  });

  it('weekHeadline ohne Schuld bei leeren Wochen', () => {
    expect(weekHeadline(0, 3, true).title).toBe('Die Woche ist noch jung.');
    expect(weekHeadline(0, 7, false).title).toBe('Eine ruhige Woche.');
    expect(weekHeadline(4, 4, true)).toEqual({
      title: 'Starke Woche.',
      text: 'Du wirst zur Person, die an 4 von 4 bisherigen Tagen etwas für sich tut.',
    });
    expect(weekHeadline(3, 7, false).title).toBe('Drangeblieben.');
  });

  it('dailyEncouragement ist pro Seed stabil', () => {
    expect(dailyEncouragement(1, 3, 'x')).toBe(dailyEncouragement(1, 3, 'x'));
    expect(dailyEncouragement(0, 0, 'x')).toMatch(/ersten Habit/);
  });
});
