// lib/chores.ts
// Aufgaben (Alltag & Papierkram): jede Aufgabe endet mit einer Entscheidung —
// erledigt, losgelassen oder ein neuer, konkreter Zeitpunkt (siehe ROADMAP,
// "Aufgaben"). Oben reine Berechnungen, unten die Supabase-Aufrufe.
// Abhaken läuft über `setChoreDone` in lib/offline.ts (geht auch offline).
//
// Tage sind Kalendertage des Geräts als YYYY-MM-DD (wie `todayStr()`).

import { addDays, dateStr } from './motivation';
import { daysAgoStr, isoWeekKey, todayStr } from './period';
import { supabase } from './supabase';
import { Chore } from '../types/chore';

/** Beim dritten Verschieben fragt die App, statt still weiterzuschieben. */
export const ASK_AT_POSTPONE = 3;
/** Irgendwann-Aufgaben kommen nach so vielen Tagen in den Wochen-Check. */
const SOMEDAY_STALE_DAYS = 28;
/** Im Wochen-Check Entschiedenes taucht so lange nicht wieder auf. */
const DECIDED_RECENTLY_DAYS = 6;

export const REMIND_TIMES = ['08:00', '09:00', '12:00', '18:00', '20:00'];
export const DEFAULT_REMIND_TIME = '09:00';

export type ChoreBucket = 'today' | 'week' | 'upcoming' | 'someday';

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function dayToDate(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

export function addDaysStr(day: string, n: number): string {
  return dateStr(addDays(dayToDate(day), n));
}

function daysBetween(from: string, to: string): number {
  return Math.round((dayToDate(to).getTime() - dayToDate(from).getTime()) / (24 * 3600 * 1000));
}

export function weekOf(day: string): string {
  return isoWeekKey(dayToDate(day));
}

/** Kalendertag (Gerät) eines Zeitstempels. */
function dayOf(ts: string): string {
  return todayStr(new Date(ts));
}

/**
 * Die Woche, in die "Mitnehmen" bzw. "Diese Woche" zielt. Am Sonntag (Tag des
 * Wochen-Checks) ist das schon die neue Woche.
 */
export function targetWeek(today: string = todayStr()): string {
  return weekOf(addDaysStr(today, dayToDate(today).getUTCDay() === 0 ? 1 : 0));
}

export function bucketOf(c: Chore, today: string = todayStr()): ChoreBucket {
  const week = weekOf(today);
  if (c.due_date) {
    if (c.due_date <= today) return 'today';
    return weekOf(c.due_date) === week ? 'week' : 'upcoming';
  }
  if (c.due_week) return c.due_week <= week ? 'week' : 'upcoming';
  return 'someday';
}

export function hasOpenChild(c: Chore, all: Chore[]): boolean {
  return all.some((o) => o.parent_id === c.id && o.status === 'open');
}

/** Offene Aufgaben ohne große Aufgaben, deren Schritt gerade läuft. */
export function openChores(all: Chore[]): Chore[] {
  return all.filter((c) => c.status === 'open' && !hasOpenChild(c, all));
}

function sortKey(c: Chore): string {
  return `${c.due_date ?? c.due_week ?? '9999'}|${c.remind_at ?? 'z'}|${c.created_at}`;
}

export function sortChores(list: Chore[]): Chore[] {
  return [...list].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

/** Oben auf `Today`: fällige zuerst, darunter heute Erledigte. */
export function todayList(all: Chore[], today: string = todayStr()): { open: Chore[]; doneToday: Chore[] } {
  return {
    open: sortChores(openChores(all).filter((c) => bucketOf(c, today) === 'today')),
    doneToday: all.filter((c) => c.status === 'done' && c.done_at && dayOf(c.done_at) === today),
  };
}

export function grouped(all: Chore[], today: string = todayStr()): Record<ChoreBucket, Chore[]> {
  const out: Record<ChoreBucket, Chore[]> = { today: [], week: [], upcoming: [], someday: [] };
  for (const c of sortChores(openChores(all))) out[bucketOf(c, today)].push(c);
  out.someday.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return out;
}

/** "heute", "morgen", "Fr" (innerhalb einer Woche) oder "Fr, 23.10.". */
export function dayLabel(day: string, today: string = todayStr()): string {
  const diff = daysBetween(today, day);
  if (diff === 0) return 'heute';
  if (diff === 1) return 'morgen';
  if (diff === -1) return 'gestern';
  const d = dayToDate(day);
  if (Math.abs(diff) < 7) return WEEKDAY_SHORT[d.getUTCDay()];
  return `${WEEKDAY_SHORT[d.getUTCDay()]}, ${d.getUTCDate()}.${d.getUTCMonth() + 1}.`;
}

/** Uhrzeit der Erinnerung (Gerät), z.B. "09:00". */
export function reminderTime(c: Pick<Chore, 'remind_at'>): string | null {
  if (!c.remind_at) return null;
  const d = new Date(c.remind_at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Zeitstempel für Tag + Uhrzeit auf dem Gerät. */
export function reminderAt(day: string, time: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

/**
 * Zeile unter dem Titel. `warn` (orange) für Überfälliges und Verschobenes —
 * bewusst kein Rot (kein Schuld-Stapel).
 */
export function choreMeta(c: Chore, all: Chore[], today: string = todayStr()): { text: string | null; warn: boolean } {
  const parts: string[] = [];
  const parent = c.parent_id ? all.find((o) => o.id === c.parent_id) : undefined;
  if (parent) parts.push(`Schritt zu: ${parent.title}`);
  const overdue = !!c.due_date && c.due_date < today;
  const fromLastWeek = !!c.due_week && c.due_week < weekOf(today);
  if (overdue) parts.push(`seit ${dayLabel(c.due_date!, today)} offen`);
  else if (fromLastWeek) parts.push('von letzter Woche');
  else if (c.due_date && c.due_date > today) parts.push(dayLabel(c.due_date, today));
  else if (c.due_week && c.due_week > weekOf(today)) parts.push(`KW ${Number(c.due_week.split('-W')[1])}`);
  if (c.plan_note) parts.push(c.plan_note);
  const time = reminderTime(c);
  if (time && !overdue) parts.push(time);
  if (c.postponed_count > 0) parts.push(`${c.postponed_count}× verschoben`);
  return { text: parts.length ? parts.join(' · ') : null, warn: overdue || fromLastWeek || c.postponed_count > 0 };
}

/** Würde dieses Verschieben das dritte sein? Dann statt Verschieben fragen. */
export function shouldAskBeforePostpone(c: Chore): boolean {
  return c.postponed_count + 1 >= ASK_AT_POSTPONE;
}

/** Erinnerung auf einen anderen Tag legen, gleiche Uhrzeit. */
export function moveReminder(remindAt: string, toDay: string): string {
  return reminderAt(toDay, reminderTime({ remind_at: remindAt })!);
}

/**
 * Nach hinten schieben. Zählt als Verschieben, außer die Aufgabe hatte noch
 * gar keinen Zeitpunkt (Irgendwann → Woche/Tag ist Planen, kein Aufschieben).
 */
export function postponePatch(c: Chore, to: { day: string } | { week: string } | 'someday'): Partial<Chore> {
  const day = typeof to === 'object' && 'day' in to ? to.day : null;
  const week = typeof to === 'object' && 'week' in to ? to.week : null;
  const counts = !!(c.due_date || c.due_week);
  return {
    due_date: day,
    due_week: week,
    remind_at: c.remind_at && day ? moveReminder(c.remind_at, day) : null,
    postponed_count: c.postponed_count + (counts ? 1 : 0),
  };
}

/**
 * Braucht die Aufgabe eine Entscheidung im Wochen-Check? Offen aus der
 * vergangenen Woche, überfällig, schon oft verschoben oder lange unberührt
 * unter Irgendwann. Am Sonntag zählt die gerade endende Woche schon mit.
 */
export function needsDecision(c: Chore, all: Chore[], today: string = todayStr()): boolean {
  if (c.status !== 'open' || hasOpenChild(c, all)) return false;
  if (c.last_decided_at && daysBetween(dayOf(c.last_decided_at), today) < DECIDED_RECENTLY_DAYS) return false;
  if (c.due_date) return c.due_date < today || c.postponed_count >= ASK_AT_POSTPONE;
  if (c.due_week) return c.due_week < targetWeek(today) || c.postponed_count >= ASK_AT_POSTPONE;
  return daysBetween(dayOf(c.created_at), today) >= SOMEDAY_STALE_DAYS;
}

export function decisionList(all: Chore[], today: string = todayStr()): Chore[] {
  return sortChores(all.filter((c) => needsDecision(c, all, today)));
}

/** Kurzer Hinweis im Wochen-Check, warum die Aufgabe dran ist. */
export function decisionMeta(c: Chore, today: string = todayStr()): string {
  const age = daysBetween(dayOf(c.created_at), today);
  const parts = [age >= 14 ? `Seit ${Math.round(age / 7)} Wochen offen` : age > 1 ? `Seit ${age} Tagen offen` : 'Neu'];
  if (!c.due_date && !c.due_week) parts.push('Irgendwann');
  if (c.postponed_count > 0) parts.push(`${c.postponed_count}× verschoben`);
  return parts.join(' · ');
}

/** Erledigt und losgelassen in einem Zeitraum (Tage inklusive), für den Rückblick. */
export function choreCounts(
  chores: Pick<Chore, 'status' | 'done_at' | 'let_go_at'>[],
  from: string,
  to: string
): { done: number; letGo: number } {
  const inRange = (ts: string | null) => !!ts && dayOf(ts) >= from && dayOf(ts) <= to;
  return {
    done: chores.filter((c) => c.status === 'done' && inRange(c.done_at)).length,
    letGo: chores.filter((c) => c.status === 'let_go' && inRange(c.let_go_at)).length,
  };
}

// ---- Supabase ---------------------------------------------------------------

/** Offene Aufgaben plus kürzlich Abgeschlossene (für "heute erledigt" und die Wochenbilanz). */
export function fetchChores() {
  const since = daysAgoStr(14);
  return supabase
    .from('chores')
    .select('*')
    .or(`status.eq.open,done_at.gte.${since},let_go_at.gte.${since}`)
    .order('created_at', { ascending: true });
}

export type NewChore = Pick<Chore, 'title' | 'due_date' | 'due_week' | 'remind_at'>;

export function addChore(input: NewChore) {
  return supabase.from('chores').insert(input);
}

export function updateChore(id: string, patch: Partial<Chore>) {
  return supabase.from('chores').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
}

export function postponeChore(c: Chore, to: Parameters<typeof postponePatch>[1]) {
  return updateChore(c.id, postponePatch(c, to));
}

export function letGoChore(c: Chore) {
  const now = new Date().toISOString();
  return updateChore(c.id, { status: 'let_go', let_go_at: now, remind_at: null, last_decided_at: now });
}

/** "Kleiner machen": der erste Schritt wird die Aufgabe für heute, die große wartet. */
export async function makeSmaller(c: Chore, step: string, today: string = todayStr()) {
  const { error } = await supabase.from('chores').insert({ title: step, due_date: today, parent_id: c.id });
  if (error) return { error };
  return updateChore(c.id, { due_date: null, due_week: null, remind_at: null, last_decided_at: new Date().toISOString() });
}

/** "Fester Termin": Tag + Anlass, optional mit Erinnerung. */
export function planChore(c: Chore, day: string, note: string | null, time: string | null) {
  return updateChore(c.id, {
    due_date: day,
    due_week: null,
    plan_note: note,
    remind_at: time ? reminderAt(day, time) : null,
    last_decided_at: new Date().toISOString(),
  });
}

/**
 * Nach dem Abhaken eines Schritts kommt die große Aufgabe in die Woche zurück
 * — mit frischem Zähler, der nächste Schritt ist ein Neuanfang.
 */
export async function afterStepDone(c: Chore, all: Chore[], today: string = todayStr()) {
  if (!c.parent_id) return;
  const parent = all.find((o) => o.id === c.parent_id);
  if (!parent || parent.status !== 'open') return;
  if (all.some((o) => o.parent_id === parent.id && o.id !== c.id && o.status === 'open')) return;
  await updateChore(parent.id, { due_week: targetWeek(today), due_date: null, postponed_count: 0 });
}
