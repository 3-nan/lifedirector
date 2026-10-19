// lib/use-chores.ts
// Gemeinsame Aufgaben-Logik für `Today` und den Aufgaben-Screen: laden (mit
// Offline-Stand), abhaken, verschieben mit Nachfrage ab dem dritten Mal.
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import type { CaptureResult, PostponeChoice } from '../components/chore-sheets';
import {
  addChore, addDaysStr, afterStepDone, fetchChores, letGoChore, makeSmaller, planChore, postponeChore, reminderAt,
  shouldAskBeforePostpone, updateChore,
} from './chores';
import { onChoreAction, refreshChoreReminders } from './notifications';
import { cached, pendingChoreDone, setChoreDone } from './offline';
import { todayStr } from './period';
import { Chore } from '../types/chore';

type Result = { error: { message: string } | null };

function failed(res: Result): boolean {
  if (res.error) {
    Alert.alert('Fehler', res.error.message);
    return true;
  }
  return false;
}

export function useChores() {
  const [chores, setChores] = useState<Chore[]>([]);
  /** Aufgabe, für die gerade das "3× verschoben"-Sheet offen ist. */
  const [asking, setAsking] = useState<Chore | null>(null);

  const load = useCallback(async () => {
    const data = await cached<Chore[]>('chores', fetchChores);
    const pending = await pendingChoreDone();
    setChores((data ?? []).map((c) =>
      c.id in pending
        ? { ...c, status: pending[c.id].done ? 'done' : 'open', done_at: pending[c.id].done ? pending[c.id].at : null }
        : c));
  }, []);

  // Aktionen aus einer Erinnerung (Erledigt / Morgen) sofort zeigen.
  useEffect(() => onChoreAction(() => { load(); }), [load]);

  /** Nach Änderungen: neu laden und die Erinnerungen neu planen. */
  const changed = useCallback(async () => {
    await load();
    refreshChoreReminders();
  }, [load]);

  async function toggle(c: Chore) {
    const done = c.status !== 'done';
    const at = new Date().toISOString();
    setChores((prev) => prev.map((o) => (o.id === c.id ? { ...o, status: done ? 'done' : 'open', done_at: done ? at : null } : o)));
    await setChoreDone(c.id, done);
    if (done) await afterStepDone(c, chores);
    changed();
  }

  /** "Später" = morgen; beim dritten Mal stattdessen fragen. */
  async function postpone(c: Chore, to: Parameters<typeof postponeChore>[1] = { day: addDaysStr(todayStr(), 1) }) {
    // Nur wenn es als Verschieben zählt (Irgendwann einplanen zählt nicht).
    if (shouldAskBeforePostpone(c) && (c.due_date || c.due_week)) {
      setAsking(c);
      return;
    }
    if (failed(await postponeChore(c, to))) return;
    changed();
  }

  async function choose(c: Chore, choice: PostponeChoice) {
    const res =
      choice.kind === 'smaller' ? await makeSmaller(c, choice.step)
        : choice.kind === 'plan' ? await planChore(c, choice.day, choice.note, choice.time)
          : choice.kind === 'letGo' ? await letGoChore(c)
            : await postponeChore(c, { day: addDaysStr(todayStr(), 1) });
    if (failed(res)) return;
    changed();
  }

  async function capture(r: CaptureResult): Promise<boolean> {
    const res = await addChore({
      title: r.title,
      due_date: r.due_date,
      due_week: r.due_week,
      remind_at: r.due_date && r.remindTime ? reminderAt(r.due_date, r.remindTime) : null,
    });
    if (failed(res)) return false;
    changed();
    return true;
  }

  /** Aus "Diese Woche" auf heute holen (zählt nicht als Verschieben). */
  async function toToday(c: Chore) {
    if (failed(await updateChore(c.id, { due_date: todayStr(), due_week: null }))) return;
    changed();
  }

  return { chores, load, changed, toggle, postpone, choose, capture, toToday, asking, setAsking };
}
