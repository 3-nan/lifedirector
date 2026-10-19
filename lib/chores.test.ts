import { describe, expect, it, vi } from 'vitest';
import type { Chore } from '../types/chore';
import {
  bucketOf, choreCounts, choreMeta, dayLabel, decisionList, grouped, moveReminder, needsDecision, postponePatch,
  reminderAt, reminderTime, shouldAskBeforePostpone, targetWeek, todayList,
} from './chores';

vi.mock('./supabase', () => ({ supabase: {} }));

// Montag, 19.10.2026 (KW 43). Zeitzone Europe/Berlin (vitest.config.mts).
const TODAY = '2026-10-19';
const SUNDAY = '2026-10-25';

function chore(id: string, extra: Partial<Chore> = {}): Chore {
  return {
    id,
    title: id,
    status: 'open',
    due_date: null,
    due_week: null,
    remind_at: null,
    plan_note: null,
    postponed_count: 0,
    parent_id: null,
    done_at: null,
    let_go_at: null,
    last_decided_at: null,
    created_at: '2026-10-15T08:00:00Z',
    updated_at: '2026-10-15T08:00:00Z',
    ...extra,
  };
}

describe('Einordnung', () => {
  it('heute und überfällig landen auf Heute', () => {
    expect(bucketOf(chore('a', { due_date: TODAY }), TODAY)).toBe('today');
    expect(bucketOf(chore('a', { due_date: '2026-10-16' }), TODAY)).toBe('today');
  });

  it('später in der Woche und die Woche selbst sind "Diese Woche"', () => {
    expect(bucketOf(chore('a', { due_date: '2026-10-22' }), TODAY)).toBe('week');
    expect(bucketOf(chore('a', { due_week: '2026-W43' }), TODAY)).toBe('week');
    expect(bucketOf(chore('a', { due_week: '2026-W42' }), TODAY)).toBe('week');
  });

  it('danach Demnächst, ohne Zeitpunkt Irgendwann', () => {
    expect(bucketOf(chore('a', { due_date: '2026-10-26' }), TODAY)).toBe('upcoming');
    expect(bucketOf(chore('a', { due_week: '2026-W44' }), TODAY)).toBe('upcoming');
    expect(bucketOf(chore('a'), TODAY)).toBe('someday');
  });

  it('große Aufgaben mit offenem Schritt sind ausgeblendet', () => {
    const all = [chore('big'), chore('step', { parent_id: 'big', due_date: TODAY })];
    const g = grouped(all, TODAY);
    expect(g.today.map((c) => c.id)).toEqual(['step']);
    expect(g.someday).toEqual([]);
  });

  it('Heute zeigt Fälliges sortiert und heute Erledigtes', () => {
    const all = [
      chore('spaet', { due_date: TODAY, remind_at: reminderAt(TODAY, '18:00') }),
      chore('alt', { due_date: '2026-10-16' }),
      chore('frueh', { due_date: TODAY, remind_at: reminderAt(TODAY, '09:00') }),
      chore('fertig', { status: 'done', due_date: TODAY, done_at: '2026-10-19T07:30:00Z' }),
      chore('gestern', { status: 'done', done_at: '2026-10-18T07:30:00Z' }),
    ];
    const { open, doneToday } = todayList(all, TODAY);
    expect(open.map((c) => c.id)).toEqual(['alt', 'frueh', 'spaet']);
    expect(doneToday.map((c) => c.id)).toEqual(['fertig']);
  });
});

describe('Anzeige', () => {
  it('Tage relativ zu heute', () => {
    expect(dayLabel(TODAY, TODAY)).toBe('heute');
    expect(dayLabel('2026-10-20', TODAY)).toBe('morgen');
    expect(dayLabel('2026-10-16', TODAY)).toBe('Fr');
    expect(dayLabel('2026-10-29', TODAY)).toBe('Do, 29.10.');
  });

  it('Überfälliges orange, ohne Rot', () => {
    const meta = choreMeta(chore('a', { due_date: '2026-10-16', postponed_count: 1 }), [], TODAY);
    expect(meta).toEqual({ text: 'seit Fr offen · 1× verschoben', warn: true });
  });

  it('Schritt zeigt die große Aufgabe, Erinnerung die Uhrzeit', () => {
    const big = chore('big', { title: 'Steuererklärung' });
    const step = chore('step', { parent_id: 'big', due_date: TODAY, remind_at: reminderAt(TODAY, '09:00') });
    expect(choreMeta(step, [big, step], TODAY)).toEqual({ text: 'Schritt zu: Steuererklärung · 09:00', warn: false });
  });

  it('Erinnerung in lokaler Zeit', () => {
    const at = reminderAt(TODAY, '09:00');
    expect(at).toBe('2026-10-19T07:00:00.000Z');
    expect(reminderTime({ remind_at: at })).toBe('09:00');
  });
});

describe('Verschieben', () => {
  it('zählt, nimmt die Erinnerung mit gleicher Uhrzeit mit', () => {
    const c = chore('a', { due_date: TODAY, remind_at: reminderAt(TODAY, '09:00'), postponed_count: 1 });
    expect(postponePatch(c, { day: '2026-10-20' })).toEqual({
      due_date: '2026-10-20',
      due_week: null,
      remind_at: moveReminder(c.remind_at!, '2026-10-20'),
      postponed_count: 2,
    });
    expect(reminderTime({ remind_at: moveReminder(c.remind_at!, '2026-10-20') })).toBe('09:00');
  });

  it('Irgendwann einplanen ist kein Verschieben', () => {
    expect(postponePatch(chore('a'), { week: '2026-W43' }).postponed_count).toBe(0);
  });

  it('in eine Woche schieben verwirft die Erinnerung', () => {
    const c = chore('a', { due_date: TODAY, remind_at: reminderAt(TODAY, '09:00') });
    expect(postponePatch(c, { week: '2026-W44' }).remind_at).toBeNull();
  });

  it('beim dritten Mal wird gefragt', () => {
    expect(shouldAskBeforePostpone(chore('a', { postponed_count: 1 }))).toBe(false);
    expect(shouldAskBeforePostpone(chore('a', { postponed_count: 2 }))).toBe(true);
  });
});

describe('Wochen-Check', () => {
  it('am Sonntag zielt "Mitnehmen" auf die neue Woche', () => {
    expect(targetWeek(TODAY)).toBe('2026-W43');
    expect(targetWeek(SUNDAY)).toBe('2026-W44');
  });

  it('Offenes aus der endenden Woche zählt am Sonntag schon mit', () => {
    const c = chore('a', { due_week: '2026-W43' });
    expect(needsDecision(c, [c], TODAY)).toBe(false);
    expect(needsDecision(c, [c], SUNDAY)).toBe(true);
  });

  it('überfällig, oft verschoben oder lange Irgendwann', () => {
    const overdue = chore('overdue', { due_date: '2026-10-16' });
    const often = chore('often', { due_date: '2026-10-22', postponed_count: 3 });
    const fresh = chore('fresh', { due_date: '2026-10-22' });
    const oldSomeday = chore('old', { created_at: '2026-09-01T08:00:00Z' });
    const newSomeday = chore('new');
    const all = [overdue, often, fresh, oldSomeday, newSomeday];
    expect(decisionList(all, TODAY).map((c) => c.id)).toEqual(['overdue', 'often', 'old']);
  });

  it('kürzlich Entschiedenes und große Aufgaben mit Schritt nicht', () => {
    const decided = chore('d', { due_date: '2026-10-16', last_decided_at: '2026-10-17T10:00:00Z' });
    const big = chore('big', { created_at: '2026-09-01T08:00:00Z' });
    const step = chore('step', { parent_id: 'big', due_date: TODAY });
    expect(decisionList([decided, big, step], TODAY)).toEqual([]);
  });
});

describe('Rückblick', () => {
  it('zählt Erledigtes und Losgelassenes im Zeitraum', () => {
    const list = [
      chore('a', { status: 'done', done_at: '2026-10-19T09:00:00Z' }),
      chore('b', { status: 'done', done_at: '2026-10-11T09:00:00Z' }),
      chore('c', { status: 'let_go', let_go_at: '2026-10-25T20:00:00Z' }),
      chore('d'),
    ];
    expect(choreCounts(list, '2026-10-19', '2026-10-25')).toEqual({ done: 1, letGo: 1 });
  });
});
