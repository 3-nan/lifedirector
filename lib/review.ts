// lib/review.ts
// Rückblick (Woche/Monat): zeigt vor allem, was geschafft wurde — keine roten
// Balken, kein "schwächster Habit" (siehe ROADMAP, "Kein Schuld-Stapel").
// Reine Berechnungen, die Daten lädt `app/(tabs)/review.tsx`.
//
// Tage sind wie in lib/motivation.ts UTC-Datums-Strings (YYYY-MM-DD).

import { CATEGORY_EMOJI, CATEGORY_ROTATION } from './challenges';
import { choreCounts } from './chores';
import { STAGE_FIRM, frequencyLabel, isDaily, targetOf } from './habits';
import {
  MILESTONES, addDays, bestStreak, computeStreak, computeWeekStreak, countInWeek, dateStr, joinGerman, mondayOf,
  weekHeadline, weeksMet,
} from './motivation';
import { isoWeekKey, localToday, monthKey, todayStr } from './period';
import { Challenge } from '../types/challenge';
import { Chore } from '../types/chore';
import { Dream, DreamStep } from '../types/dream';
import { Habit } from '../types/habit';
import { MonthlyGoal } from '../types/monthlyGoal';
import { Task } from '../types/task';

export type DoneTask = Pick<Task, 'id' | 'category' | 'dream_id' | 'week_key' | 'completed_at'>;
export type CompletedChallenge = { completed_at: string; challenge: Pick<Challenge, 'id' | 'title' | 'category'> };
export type DoneStep = Pick<DreamStep, 'id' | 'dream_id' | 'title' | 'done_at'>;
export type DreamRef = Pick<Dream, 'id' | 'title' | 'emoji' | 'fulfilled_at'>;
export type ClosedChore = Pick<Chore, 'status' | 'done_at' | 'let_go_at'>;

export type ReviewData = {
  /** Aktive Habits. */
  habits: Habit[];
  /** Erledigte Tage pro Habit, auch von gelöschten (für die Gesamtbilanz). */
  doneDates: Record<string, Set<string>>;
  /** Nur erledigte Tasks. */
  tasks: DoneTask[];
  goals: MonthlyGoal[];
  /** Aufsteigend nach `completed_at`. */
  challenges: CompletedChallenge[];
  /** Nur erledigte Traum-Schritte. */
  steps: DoneStep[];
  dreams: DreamRef[];
  /** Erledigte und losgelassene Aufgaben. */
  chores: ClosedChore[];
};

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

const createdKey = (h: Habit) => h.created_at.slice(0, 10);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function datesOf(data: ReviewData, habit: Habit): Set<string> {
  return data.doneDates[habit.id] ?? new Set<string>();
}

/** Frühester Tag mit Daten — davor lässt sich nicht zurückblättern. */
export function earliestDate(data: ReviewData): Date {
  let earliest = todayStr();
  for (const h of data.habits) if (createdKey(h) < earliest) earliest = createdKey(h);
  for (const set of Object.values(data.doneDates)) for (const d of set) if (d < earliest) earliest = d;
  return new Date(earliest);
}

// ---- Woche -----------------------------------------------------------------

export type Win = { emoji: string; title: string; sub?: string };
export type WeekDay = { date: string; label: string; rate: number; perfect: boolean; future: boolean };
export type WeekHabitRow = { habit: Habit; done: number; target: number; met: boolean; dots: boolean[] };
/** `id` merkt sich "Passt so" pro Habit und Woche. */
export type WeekTip = { id: string; habit: Habit; suggested: number; text: string };

export type WeekReview = {
  title: string;
  range: string;
  isCurrent: boolean;
  total: number;
  /** Nur gesetzt, wenn es mehr als in der Vorwoche war — sonst kein Vergleich. */
  improvement: { diff: number; previousTitle: string } | null;
  headline: { title: string; text: string };
  wins: Win[];
  days: WeekDay[];
  rows: WeekHabitRow[];
  tip: WeekTip | null;
};

/** Mo/Di zeigt der Rückblick die letzte, fertige Woche — sonst die laufende. */
export function defaultWeekOffset(today: Date = localToday()): number {
  const day = today.getUTCDay();
  return day === 1 || day === 2 ? 1 : 0;
}

export function maxWeekOffset(earliest: Date, today: Date = localToday()): number {
  return Math.max(0, Math.round((mondayOf(today).getTime() - mondayOf(earliest).getTime()) / (7 * 24 * 3600 * 1000)));
}

function weekTitle(monday: Date): string {
  return `KW ${Number(isoWeekKey(addDays(monday, 3)).slice(-2))}`;
}

function weekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const a = monday.getUTCDate();
  const b = sunday.getUTCDate();
  if (monday.getUTCMonth() === sunday.getUTCMonth()) return `${a}.–${b}. ${MONTHS[sunday.getUTCMonth()]}`;
  return `${a}. ${MONTHS[monday.getUTCMonth()]} – ${b}. ${MONTHS[sunday.getUTCMonth()]}`;
}

export function weekReview(data: ReviewData, offset: number, isFirstWeek: boolean, today: Date = localToday()): WeekReview {
  const monday = addDays(mondayOf(today), -7 * offset);
  const sunday = addDays(monday, 6);
  const dates = WEEKDAYS.map((_, i) => dateStr(addDays(monday, i)));
  const todayKey = dateStr(today);
  const isCurrent = offset === 0;

  const habits = data.habits.filter((h) => createdKey(h) <= dates[6]);
  const has = (h: Habit, date: string) => datesOf(data, h).has(date);

  const total = habits.reduce((sum, h) => sum + countInWeek(datesOf(data, h), monday), 0);
  const prevMonday = addDays(monday, -7);
  const prevTotal = data.habits
    .filter((h) => createdKey(h) < dates[0])
    .reduce((sum, h) => sum + countInWeek(datesOf(data, h), prevMonday), 0);
  const improvement = prevTotal > 0 && total > prevTotal
    ? { diff: total - prevTotal, previousTitle: weekTitle(prevMonday) }
    : null;

  const elapsed = dates.filter((d) => d <= todayKey).length;
  const activeDays = dates.filter((d) => habits.some((h) => has(h, d))).length;

  // Erwartete Erledigungen pro Tag: ein 3×-Habit zählt mit 3/7 statt voll.
  const expectedPerDay = habits.reduce((sum, h) => sum + targetOf(h) / 7, 0);
  const dailyHabits = habits.filter((h) => isDaily(targetOf(h)));
  const days: WeekDay[] = dates.map((date, i) => {
    const doneCount = habits.filter((h) => has(h, date)).length;
    // "Perfekt" = alle täglichen Habits erledigt; 1–6×-Habits sind an einem Tag nie Pflicht.
    const due = dailyHabits.filter((h) => createdKey(h) <= date);
    return {
      date,
      label: WEEKDAYS[i],
      rate: expectedPerDay > 0 ? Math.min(1, doneCount / expectedPerDay) : 0,
      perfect: due.length > 0 && due.every((h) => has(h, date)),
      future: date > todayKey,
    };
  });

  const rate = (r: { done: number; target: number }) => Math.min(1, r.done / r.target);
  const rows: WeekHabitRow[] = habits
    .map((habit) => {
      const target = targetOf(habit);
      const done = countInWeek(datesOf(data, habit), monday);
      return { habit, done, target, met: done >= target, dots: dates.map((d) => has(habit, d)) };
    })
    .sort((a, b) => rate(b) - rate(a));

  const wins: Win[] = [];
  for (const r of rows) {
    if (isDaily(r.target)) continue;
    if (!r.met) continue;
    const weekStreak = computeWeekStreak(datesOf(data, r.habit), r.target, sunday);
    wins.push({
      emoji: '🎯',
      title: `${r.habit.name}: Wochenziel erreicht`,
      sub: `${r.done} von ${r.target}${weekStreak >= 2 ? ` · die ${weekStreak}. Woche in Folge` : ''}`,
    });
  }
  for (const r of rows) {
    if (!isDaily(r.target)) continue;
    const streak = computeStreak(datesOf(data, r.habit), isCurrent ? today : sunday);
    if (streak < 3) continue;
    const next = MILESTONES.find((m) => m > streak);
    wins.push({
      emoji: '🔥',
      title: `${r.habit.name}: ${streak} Tage am Stück`,
      sub: next ? `Nächster Meilenstein: ${next} Tage` : 'Dreistellig. Das bist jetzt einfach du.',
    });
  }
  const perfectNames = days.flatMap((d, i) => (d.perfect ? [WEEKDAY_NAMES[i]] : []));
  if (perfectNames.length > 0) {
    wins.push({
      emoji: '⭐',
      title: perfectNames.length === 1 ? '1 perfekter Tag' : `${perfectNames.length} perfekte Tage`,
      sub: `${joinGerman(perfectNames)}: alles erledigt`,
    });
  }
  const weekKey = isoWeekKey(addDays(monday, 3));
  const tasks = data.tasks.filter((t) => t.week_key === weekKey);
  if (tasks.length > 0) {
    const dreamTasks = tasks.filter((t) => t.dream_id);
    const dream = dreamTasks.length === 1 ? data.dreams.find((d) => d.id === dreamTasks[0].dream_id) : undefined;
    wins.push({
      emoji: '✅',
      title: `${plural(tasks.length, 'Wochen-Task', 'Wochen-Tasks')} erledigt`,
      sub: dream
        ? `davon 1 Schritt zu ${dream.emoji} ${dream.title}`
        : dreamTasks.length > 0 ? `davon ${plural(dreamTasks.length, 'Traum-Schritt', 'Traum-Schritte')}` : undefined,
    });
  }
  const chores = choreCounts(data.chores, dates[0], dates[6]);
  if (chores.done > 0) {
    wins.push({
      emoji: '📋',
      title: `${plural(chores.done, 'Aufgabe', 'Aufgaben')} erledigt`,
      sub: chores.letGo > 0 ? `und ${chores.letGo} bewusst losgelassen` : undefined,
    });
  } else if (chores.letGo > 0) {
    wins.push({ emoji: '🍃', title: `${plural(chores.letGo, 'Aufgabe', 'Aufgaben')} bewusst losgelassen` });
  }
  const inWeek = (ts: string | null) => !!ts && dateStr(new Date(ts)) >= dates[0] && dateStr(new Date(ts)) <= dates[6];
  for (const c of data.challenges.filter((c) => inWeek(c.completed_at))) {
    wins.push({ emoji: '🏆', title: `Challenge gemeistert: ${c.challenge.title}` });
  }
  for (const d of data.dreams.filter((d) => inWeek(d.fulfilled_at))) {
    wins.push({ emoji: '✨', title: `Traum erfüllt: ${d.emoji} ${d.title}` });
  }

  // Ein einziger, freundlicher Vorschlag — nur für die gerade abgeschlossene
  // Woche, weil er das Ziel für die laufende ändert.
  let tip: WeekTip | null = null;
  if (offset === 1 && !isFirstWeek) {
    const candidate = rows
      .filter((r) => r.target > 1 && rate(r) < 0.5 && createdKey(r.habit) <= dates[0])
      .sort((a, b) => rate(a) - rate(b))[0];
    const suggested = candidate ? Math.max(1, candidate.done) : 0;
    if (candidate && suggested < candidate.target) {
      tip = {
        id: `${candidate.habit.id}:${dates[0]}`,
        habit: candidate.habit,
        suggested,
        text: candidate.done > 0
          ? `„${candidate.habit.name}“ kam letzte Woche auf ${candidate.done} von ${candidate.target}. Ein kleineres Ziel fühlt sich oft leichter an — mit ${frequencyLabel(suggested)} wäre es schon voll erreicht gewesen.`
          : `„${candidate.habit.name}“ hatte letzte Woche Pause. Ein kleines Ziel macht den Neustart leichter — wie wäre es erst mal mit ${frequencyLabel(1)}?`,
      };
    }
  }

  return {
    title: weekTitle(monday),
    range: weekRange(monday),
    isCurrent,
    total,
    improvement,
    headline: weekHeadline(activeDays, elapsed, isCurrent),
    wins,
    days,
    rows,
    tip,
  };
}

// ---- Monat -----------------------------------------------------------------

export type MonthHabitRow = {
  habit: Habit;
  /** Ein Eintrag pro Woche des Monats (bis heute): Anteil am Wochenziel, 0–1. */
  weeks: number[];
  met: number;
  /** Wochen, die zählen: abgeschlossene + die laufende, falls ihr Ziel schon steht. */
  counted: number;
  checkOffs: number;
  onTrack: boolean;
};

export type MonthDream = { dream: DreamRef; steps: number; lastStep: string | null; fulfilled: boolean };

export type MonthReview = {
  title: string;
  isCurrent: boolean;
  goalsReached: number;
  checkOffs: number;
  headline: { title: string; text: string };
  challenges: { title: string; category: Challenge['category']; number: number }[];
  goals: MonthlyGoal[];
  dreams: MonthDream[];
  tasks: { count: number; breakdown: string | null };
  chores: { done: number; letGo: number };
  habits: MonthHabitRow[];
};

/** In den ersten Tagen eines Monats zeigt der Rückblick den Vormonat. */
export function defaultMonthOffset(today: Date = localToday()): number {
  return today.getDate() <= 5 ? 1 : 0;
}

export function maxMonthOffset(earliest: Date, today: Date = localToday()): number {
  return Math.max(0, (today.getFullYear() - earliest.getFullYear()) * 12 + today.getMonth() - earliest.getMonth());
}

/** Montage der ISO-Wochen, deren Donnerstag im Monat liegt (wie bei KW-Zuordnungen üblich). */
function weeksOfMonth(year: number, month: number): Date[] {
  const mondays: Date[] = [];
  const last = new Date(Date.UTC(year, month + 1, 0));
  for (let m = mondayOf(new Date(Date.UTC(year, month, 1))); m <= last; m = addDays(m, 7)) {
    if (addDays(m, 3).getUTCMonth() === month) mondays.push(m);
  }
  return mondays;
}

export function monthReview(data: ReviewData, offset: number, today: Date = localToday()): MonthReview {
  const first = new Date(today.getFullYear(), today.getMonth() - offset, 1);
  const key = monthKey(first);
  const isCurrent = offset === 0;
  const title = MONTHS[first.getMonth()] + (first.getFullYear() !== today.getFullYear() ? ` ${first.getFullYear()}` : '');
  const inMonth = (ts: string | null) => !!ts && monthKey(new Date(ts)) === key;

  const challenges = data.challenges.flatMap((c, i) =>
    inMonth(c.completed_at) ? [{ title: c.challenge.title, category: c.challenge.category, number: i + 1 }] : []);

  const goals = data.goals
    .filter((g) => g.month_key === key)
    .sort((a, b) => Number(b.done) - Number(a.done));
  const goalsDone = goals.filter((g) => g.done).length;

  const byDream = new Map<string, MonthDream>();
  const entry = (dream: DreamRef) => {
    if (!byDream.has(dream.id)) byDream.set(dream.id, { dream, steps: 0, lastStep: null, fulfilled: false });
    return byDream.get(dream.id)!;
  };
  const steps = data.steps.filter((s) => inMonth(s.done_at)).sort((a, b) => (a.done_at! < b.done_at! ? -1 : 1));
  for (const s of steps) {
    const dream = data.dreams.find((d) => d.id === s.dream_id);
    if (!dream) continue;
    const e = entry(dream);
    e.steps += 1;
    e.lastStep = s.title;
  }
  for (const d of data.dreams.filter((d) => inMonth(d.fulfilled_at))) entry(d).fulfilled = true;
  const dreams = [...byDream.values()].sort((a, b) => Number(b.fulfilled) - Number(a.fulfilled) || b.steps - a.steps);
  const fulfilled = dreams.filter((d) => d.fulfilled).length;

  const tasks = data.tasks.filter((t) => inMonth(t.completed_at));
  const breakdown = CATEGORY_ROTATION
    .map((c) => [c, tasks.filter((t) => t.category === c).length] as const)
    .filter(([, n]) => n > 0)
    .map(([c, n]) => `${CATEGORY_EMOJI[c]} ${n}`)
    .join(' · ');

  const thisMonday = mondayOf(today);
  const mondays = weeksOfMonth(first.getFullYear(), first.getMonth());
  const habits: MonthHabitRow[] = data.habits
    .map((habit) => {
      const target = targetOf(habit);
      const dates = datesOf(data, habit);
      const createdMonday = mondayOf(new Date(createdKey(habit)));
      const weeks = mondays.filter((m) => m >= createdMonday && m <= thisMonday);
      const counts = weeks.map((m) => countInWeek(dates, m));
      const met = counts.filter((c) => c >= target).length;
      const running = weeks.some((m) => m.getTime() === thisMonday.getTime()) && counts[counts.length - 1] < target;
      const counted = weeks.length - (running ? 1 : 0);
      return {
        habit,
        weeks: counts.map((c) => Math.min(1, c / target)),
        met,
        counted,
        checkOffs: [...dates].filter((d) => d.startsWith(key)).length,
        onTrack: counted > 0 && met === counted,
      };
    })
    // Ohne einen einzigen Haken im Monat keine Zeile — der Rückblick zeigt Geschafftes.
    .filter((r) => r.weeks.length > 0 && r.checkOffs > 0)
    .sort((a, b) => (b.counted ? b.met / b.counted : 0) - (a.counted ? a.met / a.counted : 0));
  const onTrack = habits.filter((h) => h.onTrack).length;
  const checkOffs = habits.reduce((sum, h) => sum + h.checkOffs, 0);

  const goalsReached = challenges.length + goalsDone + onTrack + fulfilled;
  const parts = [
    challenges.length === 1 ? 'Challenge gemeistert' : challenges.length > 1 ? `${challenges.length} Challenges gemeistert` : '',
    goalsDone > 0 ? `${plural(goalsDone, 'Monatsziel', 'Monatsziele')} geschafft` : '',
    onTrack > 0 ? `${plural(onTrack, 'Gewohnheit', 'Gewohnheiten')} jede Woche auf Kurs` : '',
    fulfilled > 0 ? `${plural(fulfilled, 'Traum', 'Träume')} erfüllt` : '',
  ].filter(Boolean);
  const headline = goalsReached > 0
    ? { title: isCurrent ? 'Der Monat läuft.' : 'Ein Monat, der zählt.', text: `${joinGerman(parts)}.` }
    : checkOffs > 0
      ? { title: 'Jeder Haken zählt.', text: 'Die Ziele kommen mit — du bist dran.' }
      : { title: isCurrent ? 'Der Monat ist noch offen.' : 'Ein ruhiger Monat.', text: 'Jeder Monat fängt frisch an — ohne Schuld.' };

  return {
    title,
    isCurrent,
    goalsReached,
    checkOffs,
    headline,
    challenges,
    goals,
    dreams,
    tasks: { count: tasks.length, breakdown: breakdown || null },
    chores: choreCounts(data.chores, `${key}-01`, `${key}-31`),
    habits,
  };
}

// ---- Gesamtbilanz ----------------------------------------------------------

export type Badge = { emoji: string; label: string; unlocked: boolean };

export type AllTime = {
  checkOffs: number;
  weekGoals: number;
  goalsDone: number;
  challenges: number;
  steps: number;
  fulfilled: number;
  badges: Badge[];
};

export function allTime(data: ReviewData, today: Date = localToday()): AllTime {
  const checkOffs = Object.values(data.doneDates).reduce((sum, d) => sum + d.size, 0);
  const weekGoals = data.habits.reduce((sum, h) => sum + weeksMet(datesOf(data, h), targetOf(h), today), 0);
  const longest = Math.max(0, ...data.habits.filter((h) => isDaily(targetOf(h))).map((h) => bestStreak(datesOf(data, h))));
  const firmest = Math.max(0, ...data.habits.map((h) => datesOf(data, h).size));
  const goalsDone = data.goals.filter((g) => g.done).length;
  const fulfilled = data.dreams.filter((d) => d.fulfilled_at).length;

  // Aus der Historie berechnet, nicht gespeichert. Freigeschaltete zuerst.
  const badges: Badge[] = [
    { emoji: '🌱', label: 'Erster Haken', unlocked: checkOffs >= 1 },
    { emoji: '🔥', label: '7 Tage am Stück', unlocked: longest >= 7 },
    { emoji: '🎯', label: '10 Wochenziele', unlocked: weekGoals >= 10 },
    { emoji: '🏆', label: 'Erste Challenge', unlocked: data.challenges.length >= 1 },
    { emoji: '📌', label: '5 Monatsziele', unlocked: goalsDone >= 5 },
    { emoji: '🪜', label: '10 Traum-Schritte', unlocked: data.steps.length >= 10 },
    { emoji: '⚡', label: '30 Tage am Stück', unlocked: longest >= 30 },
    { emoji: '🌳', label: 'Erste feste Gewohnheit', unlocked: firmest >= STAGE_FIRM },
    { emoji: '✨', label: 'Erster Traum erfüllt', unlocked: fulfilled >= 1 },
    { emoji: '💯', label: '100 Tage am Stück', unlocked: longest >= 100 },
  ].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));

  return { checkOffs, weekGoals, goalsDone, challenges: data.challenges.length, steps: data.steps.length, fulfilled, badges };
}
