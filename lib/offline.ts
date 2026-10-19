// lib/offline.ts
// Offline-Betrieb: letzter Stand zum Anzeigen + Abhaken ohne Netz.
//
// 1. Zwischenspeicher: `cached()` führt eine Supabase-Abfrage aus und legt das
//    Ergebnis auf dem Gerät ab. Scheitert sie (kein Netz, keine Session),
//    kommt der zuletzt gespeicherte Stand zurück und die App gilt als offline.
// 2. Abhaken: `setHabitDone` / `setTaskDone` / `setChoreDone` schreiben direkt; ohne Netz wird
//    der Wunsch auf dem Gerät gemerkt und später übertragen. Regel: abgehakt
//    gewinnt — was irgendwo abgehakt wurde, gilt als erledigt. Offline
//    zurückgenommene Haken werden deshalb nur lokal angezeigt und nie
//    übertragen; ist es auf dem Server erledigt, bleibt es erledigt.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { supabase } from './supabase';

const CACHE_PREFIX = 'offlineCache:';
const PENDING_KEY = 'offlinePending';

// ---- Offline-Status (für den Hinweis-Balken) -------------------------------

let offline = false;
const listeners = new Set<(offline: boolean) => void>();

function setOffline(value: boolean) {
  if (offline === value) return;
  offline = value;
  listeners.forEach((l) => l(value));
}

export function isOffline() {
  return offline;
}

export function onOfflineChange(listener: (offline: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---- Zwischenspeicher ------------------------------------------------------

type QueryResult<T> = { data: T | null; error: unknown };

/**
 * Abfrage mit Fallback auf den letzten Stand. Ohne Session wird gar nicht erst
 * abgefragt: anonym liefert Supabase (RLS) leere Listen statt eines Fehlers,
 * und die würden sonst den gespeicherten Stand überschreiben.
 */
export async function cached<T>(key: string, run: () => PromiseLike<QueryResult<T>>): Promise<T | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    try {
      const { data, error } = await run();
      if (!error) {
        setOffline(false);
        AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data)).catch(() => {});
        return data;
      }
    } catch {
      // Netzwerkfehler → unten den letzten Stand nehmen
    }
  }
  setOffline(true);
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Legt einen Stand ab, der anderswo vollständig geladen wurde. */
export async function writeCache(key: string, data: unknown) {
  await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data)).catch(() => {});
}

/** Liest nur den gespeicherten Stand (ohne Abfrage). */
export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// ---- Offline abhaken -------------------------------------------------------

type PendingEntry =
  | { kind: 'log'; habitId: string; date: string; done: boolean; at: string }
  | { kind: 'task'; taskId: string; done: boolean; at: string }
  | { kind: 'chore'; choreId: string; done: boolean; at: string };
type Pending = Record<string, PendingEntry>;

const logKey = (habitId: string, date: string) => `log:${habitId}:${date}`;
const taskKey = (taskId: string) => `task:${taskId}`;
const choreKey = (choreId: string) => `chore:${choreId}`;

async function readPending(): Promise<Pending> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as Pending) : {};
  } catch {
    return {};
  }
}

async function writePending(pending: Pending) {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending)).catch(() => {});
}

async function putPending(key: string, entry: PendingEntry | null) {
  const pending = await readPending();
  if (entry) pending[key] = entry;
  else delete pending[key];
  await writePending(pending);
}

/** Habit für einen Tag abhaken bzw. zurücknehmen — offline wird es gemerkt. */
export async function setHabitDone(habitId: string, date: string, done: boolean) {
  const key = logKey(habitId, date);
  try {
    const { error } = await supabase
      .from('logs')
      .upsert({ habit_id: habitId, date, done }, { onConflict: 'habit_id,date' });
    if (!error) {
      await putPending(key, null);
      return;
    }
  } catch {
    // offline
  }
  setOffline(true);
  await putPending(key, { kind: 'log', habitId, date, done, at: new Date().toISOString() });
}

/** Wochen-Task abhaken bzw. zurücknehmen — offline wird es gemerkt. */
export async function setTaskDone(taskId: string, done: boolean) {
  const key = taskKey(taskId);
  const at = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('tasks')
      .update({ done, completed_at: done ? at : null })
      .eq('id', taskId);
    if (!error) {
      await putPending(key, null);
      return;
    }
  } catch {
    // offline
  }
  setOffline(true);
  await putPending(key, { kind: 'task', taskId, done, at });
}

/** Aufgabe abhaken bzw. zurücknehmen — offline wird es gemerkt. */
export async function setChoreDone(choreId: string, done: boolean) {
  const key = choreKey(choreId);
  const at = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('chores')
      .update({ status: done ? 'done' : 'open', done_at: done ? at : null, updated_at: at })
      .eq('id', choreId);
    if (!error) {
      await putPending(key, null);
      return;
    }
  } catch {
    // offline
  }
  setOffline(true);
  await putPending(key, { kind: 'chore', choreId, done, at });
}

/** Offline gemerkte Haken auf geladene Daten legen (für die Anzeige). */
export async function pendingHabitDone(): Promise<{ habitId: string; date: string; done: boolean }[]> {
  const pending = await readPending();
  return Object.values(pending).flatMap((e) => (e.kind === 'log' ? [{ habitId: e.habitId, date: e.date, done: e.done }] : []));
}

export async function pendingTaskDone(): Promise<Record<string, boolean>> {
  const pending = await readPending();
  const out: Record<string, boolean> = {};
  Object.values(pending).forEach((e) => {
    if (e.kind === 'task') out[e.taskId] = e.done;
  });
  return out;
}

export async function pendingChoreDone(): Promise<Record<string, { done: boolean; at: string }>> {
  const pending = await readPending();
  const out: Record<string, { done: boolean; at: string }> = {};
  Object.values(pending).forEach((e) => {
    if (e.kind === 'chore') out[e.choreId] = { done: e.done, at: e.at };
  });
  return out;
}

let syncing: Promise<boolean> | null = null;

/**
 * Überträgt offline gemerkte Haken. Abhaken wird geschrieben (bei Tasks nur,
 * falls noch nicht erledigt — die frühere Erledigungszeit bleibt). Offline
 * zurückgenommene Haken werden verworfen: abgehakt gewinnt. Liefert true,
 * wenn danach nichts mehr offen ist.
 */
export function syncPending(): Promise<boolean> {
  if (!syncing) {
    syncing = doSync().finally(() => {
      syncing = null;
    });
  }
  return syncing;
}

async function doSync(): Promise<boolean> {
  const pending = await readPending();
  const keys = Object.keys(pending);
  if (keys.length === 0) return true;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  for (const key of keys) {
    const entry = pending[key];
    if (entry.done) {
      try {
        const { error } =
          entry.kind === 'log'
            ? await supabase
                .from('logs')
                .upsert({ habit_id: entry.habitId, date: entry.date, done: true }, { onConflict: 'habit_id,date' })
            : entry.kind === 'task'
              ? await supabase
                  .from('tasks')
                  .update({ done: true, completed_at: entry.at })
                  .eq('id', entry.taskId)
                  .eq('done', false)
              : await supabase
                  .from('chores')
                  .update({ status: 'done', done_at: entry.at, updated_at: entry.at })
                  .eq('id', entry.choreId)
                  .eq('status', 'open');
        if (error) return false;
      } catch {
        return false;
      }
    }
    delete pending[key];
    await writePending(pending);
  }
  setOffline(false);
  return true;
}

// Beim Zurückkehren in die App übertragen, was offline abgehakt wurde.
AppState.addEventListener('change', (state) => {
  if (state === 'active') syncPending().catch(() => {});
});
