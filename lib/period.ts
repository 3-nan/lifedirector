// lib/period.ts
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const weekNum = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Der heutige Kalendertag auf dem Gerät, als UTC-Mittag — in dieser Form
 * rechnen lib/motivation.ts und lib/review.ts mit Tagen. `new Date()` direkt
 * wäre zwischen Mitternacht und 1–2 Uhr in UTC noch der Vortag.
 */
export function localToday(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12));
}

/** Heutiges Datum auf dem Gerät (YYYY-MM-DD). */
export function todayStr(now: Date = new Date()): string {
  return localToday(now).toISOString().slice(0, 10);
}

/** ISO-Datum (YYYY-MM-DD) für "heute minus n Tage". */
export function daysAgoStr(n: number, now: Date = new Date()): string {
  const d = localToday(now);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
