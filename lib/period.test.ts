import { describe, expect, it } from 'vitest';
import { daysAgoStr, isoWeekKey, localToday, monthKey, todayStr } from './period';

// Lokale Daten (Monat 0-basiert), die Zeitzone setzt vitest.config.ts.
describe('isoWeekKey', () => {
  it('liefert die KW mitten im Jahr', () => {
    expect(isoWeekKey(new Date(2026, 9, 1))).toBe('2026-W40');
    expect(isoWeekKey(new Date(2026, 9, 15))).toBe('2026-W42');
  });

  it('Montag und Sonntag gehören zur selben Woche', () => {
    expect(isoWeekKey(new Date(2026, 9, 12))).toBe('2026-W42');
    expect(isoWeekKey(new Date(2026, 9, 18))).toBe('2026-W42');
    expect(isoWeekKey(new Date(2026, 9, 19))).toBe('2026-W43');
  });

  it('ordnet Ende Dezember der KW 1 des Folgejahres zu', () => {
    expect(isoWeekKey(new Date(2025, 11, 29))).toBe('2026-W01');
    expect(isoWeekKey(new Date(2026, 0, 1))).toBe('2026-W01');
  });

  it('kennt Jahre mit KW 53', () => {
    expect(isoWeekKey(new Date(2026, 11, 31))).toBe('2026-W53');
    expect(isoWeekKey(new Date(2027, 0, 1))).toBe('2026-W53');
    expect(isoWeekKey(new Date(2027, 0, 4))).toBe('2027-W01');
    expect(isoWeekKey(new Date(2021, 0, 1))).toBe('2020-W53');
  });
});

describe('monthKey', () => {
  it('füllt den Monat zweistellig auf', () => {
    expect(monthKey(new Date(2026, 0, 5))).toBe('2026-01');
    expect(monthKey(new Date(2026, 11, 31))).toBe('2026-12');
  });
});

describe('heute auf dem Gerät', () => {
  // 15.10.2026, 00:30 in Berlin = 14.10., 22:30 UTC.
  const justAfterMidnight = new Date(2026, 9, 15, 0, 30);

  it('nach Mitternacht ist schon der neue Tag', () => {
    expect(todayStr(justAfterMidnight)).toBe('2026-10-15');
    expect(localToday(justAfterMidnight).toISOString()).toBe('2026-10-15T12:00:00.000Z');
  });

  it('vor Mitternacht noch der alte', () => {
    expect(todayStr(new Date(2026, 9, 14, 23, 59))).toBe('2026-10-14');
  });

  it('daysAgoStr zählt von heute zurück, auch über die Zeitumstellung', () => {
    expect(daysAgoStr(1, justAfterMidnight)).toBe('2026-10-14');
    expect(daysAgoStr(6, new Date(2026, 9, 29, 0, 30))).toBe('2026-10-23');
  });
});
