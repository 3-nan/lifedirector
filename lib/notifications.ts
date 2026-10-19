import * as Device from 'expo-device';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { afterStepDone, addDaysStr, decisionList, postponeChore, reminderAt, shouldAskBeforePostpone, updateChore } from './chores';
import { targetOf } from './habits';
import { notificationCopy } from './motivation';
import { setChoreDone } from './offline';
import { daysAgoStr, todayStr } from './period';
import { supabase } from './supabase';
import { Chore } from '../types/chore';

// Seit Expo SDK 53 unterstützt Expo Go das Notifications-Modul nicht mehr
// (nur noch in einem Custom Dev Build) — und auf Android wirft schon der
// reine `import` des Pakets einen Fehler, nicht erst ein Funktionsaufruf.
// Ein try/catch um einen `import` greift syntaktisch nicht, deshalb laden
// wir das Modul hier bewusst per `require()` innerhalb eines try/catch.
type NotificationsModule = typeof import('expo-notifications');
let Notifications: NotificationsModule | null = null;
try {
  Notifications = require('expo-notifications');
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (error) {
  console.warn('Notifications nicht verfügbar (vermutlich Expo Go ohne Dev Build):', error);
}

// Feste IDs, damit sich die Erinnerungen nicht gegenseitig wegräumen.
const DAILY_ID = 'daily_reminder';
const WEEKLY_CHECK_ID = 'weekly_check';
const CHORE_PREFIX = 'chore_';
// Kategorie-IDs ohne ":" und "-" (Expo-Doku).
const CHORE_CATEGORY = 'chore';
const WEEKLY_CHECK_HOUR = 18;

let permission: Promise<boolean> | null = null;

/** Einmal pro App-Start: Erlaubnis holen und den Android-Kanal anlegen. */
function ensurePermission(): Promise<boolean> {
  if (!permission) {
    permission = (async () => {
      if (!Notifications || !Device.isDevice) return false;
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return false;
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      return true;
    })().catch(() => false);
  }
  return permission;
}

/** Erledigungsquote der letzten 7 Tage gemessen an den Wochenzielen aller aktiven Habits, 0–1. */
async function computeWeeklyRate(): Promise<number> {
  const { data: habits } = await supabase.from('habits').select('*').eq('active', true);
  const totalTarget = (habits ?? []).reduce((sum, h) => sum + targetOf(h), 0);
  if (totalTarget === 0) return 0;

  const { data: logs } = await supabase
    .from('logs').select('habit_id').gte('date', daysAgoStr(6)).eq('done', true);
  const doneByHabit: Record<string, number> = {};
  logs?.forEach((l) => { doneByHabit[l.habit_id] = (doneByHabit[l.habit_id] ?? 0) + 1; });
  const doneCapped = (habits ?? []).reduce((sum, h) => sum + Math.min(doneByHabit[h.id] ?? 0, targetOf(h)), 0);
  return doneCapped / totalTarget;
}

/**
 * Plant die tägliche Erinnerung neu — mit frischem, ermutigend formuliertem
 * Text statt einem mahnenden "Vergiss nicht X". Läuft bei jedem App-Start,
 * deshalb erst die alte geplante Erinnerung löschen (sonst stapeln sich
 * Duplikate mit veraltetem Text). Aufgaben-Erinnerungen bleiben stehen.
 */
export async function setupDailyReminder() {
  if (!Notifications) return;
  try {
    if (!(await ensurePermission())) return;

    // Bis 2026-10 hatte die tägliche Erinnerung keine feste ID — alles ohne
    // eine der Aufgaben-IDs ist sie (oder ein Überbleibsel davon).
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => !n.identifier.startsWith(CHORE_PREFIX) && n.identifier !== WEEKLY_CHECK_ID)
        .map((n) => Notifications!.cancelScheduledNotificationAsync(n.identifier)),
    );

    const weeklyRate = await computeWeeklyRate();
    const { title, body } = notificationCopy(weeklyRate, todayStr());

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
      content: { title, body },
      trigger: Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 18,
            minute: 0,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: 18,
            minute: 0,
            repeats: true,
          },
    });
  } catch (error) {
    console.warn('Tägliche Erinnerung konnte nicht eingerichtet werden (vermutlich Expo Go ohne Dev Build):', error);
  }
}

// ---- Aufgaben ---------------------------------------------------------------

function choreReminderBody(c: Chore): string {
  if (c.plan_note) return `Geplant: ${c.plan_note}. Passt es jetzt?`;
  return 'Kurz erledigen, dann ist es aus dem Kopf.';
}

/** Nächster Sonntag (heute, falls Sonntag) um 18 Uhr, als Tag. */
function nextCheckDay(today: string): string {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  return addDaysStr(today, (7 - weekday) % 7);
}

/**
 * Plant alle Aufgaben-Erinnerungen und den Wochen-Check neu. Nach jeder
 * Änderung an Aufgaben aufrufen. Ohne Netz bleibt das Geplante stehen.
 * Wie bei der täglichen Erinnerung wird der Text nur beim Öffnen berechnet:
 * die Wochen-Check-Zahl schätzt, was am Sonntag offen sein wird.
 */
export async function refreshChoreReminders() {
  if (!Notifications) return;
  try {
    if (!(await ensurePermission())) return;
    const { data, error } = await supabase.from('chores').select('*').eq('status', 'open');
    if (error || !data) return;
    const chores = data as Chore[];

    await Notifications.setNotificationCategoryAsync(CHORE_CATEGORY, [
      { identifier: 'done', buttonTitle: 'Erledigt', options: { opensAppToForeground: true } },
      { identifier: 'later', buttonTitle: 'In 1 Std.', options: { opensAppToForeground: true } },
      { identifier: 'tomorrow', buttonTitle: 'Morgen', options: { opensAppToForeground: true } },
    ]);

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(CHORE_PREFIX) || n.identifier === WEEKLY_CHECK_ID)
        .map((n) => Notifications!.cancelScheduledNotificationAsync(n.identifier)),
    );

    const now = Date.now();
    for (const c of chores) {
      if (!c.remind_at || new Date(c.remind_at).getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: CHORE_PREFIX + c.id,
        content: { title: c.title, body: choreReminderBody(c), data: { choreId: c.id }, categoryIdentifier: CHORE_CATEGORY },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(c.remind_at), channelId: 'default' },
      });
    }

    const checkDay = nextCheckDay(todayStr());
    const checkAt = new Date(reminderAt(checkDay, `${WEEKLY_CHECK_HOUR}:00`));
    const waiting = decisionList(chores, checkDay).length;
    if (waiting > 0 && checkAt.getTime() > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: WEEKLY_CHECK_ID,
        content: {
          title: 'Wochen-Check',
          body: `${waiting === 1 ? '1 Aufgabe wartet' : `${waiting} Aufgaben warten`} auf eine Entscheidung. Zwei Minuten, dann ist der Kopf frei.`,
          data: { weeklyCheck: true },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: checkAt, channelId: 'default' },
      });
    }
  } catch (error) {
    console.warn('Aufgaben-Erinnerungen konnten nicht geplant werden:', error);
  }
}

const choreListeners = new Set<() => void>();

/** Bescheid geben, wenn eine Aktion aus einer Erinnerung Aufgaben geändert hat. */
export function onChoreAction(listener: () => void): () => void {
  choreListeners.add(listener);
  return () => {
    choreListeners.delete(listener);
  };
}

type NotificationResponse = import('expo-notifications').NotificationResponse;
const handled = new Set<string>();

async function handleResponse(response: NotificationResponse) {
  const { notification, actionIdentifier } = response;
  const key = `${notification.request.identifier}|${actionIdentifier}|${notification.date}`;
  if (handled.has(key)) return;
  handled.add(key);
  const data = notification.request.content.data ?? {};

  if (data.weeklyCheck) {
    router.push('/chores-review');
    return;
  }
  const choreId = typeof data.choreId === 'string' ? data.choreId : null;
  if (!choreId || !Notifications) return;
  if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) return; // Antippen öffnet einfach `Today`

  Notifications.dismissNotificationAsync(notification.request.identifier).catch(() => {});
  const { data: rows } = await supabase.from('chores').select('*').or(`id.eq.${choreId},status.eq.open`);
  const all = (rows ?? []) as Chore[];
  const chore = all.find((c) => c.id === choreId);
  if (!chore || chore.status !== 'open') return;

  if (actionIdentifier === 'done') {
    await setChoreDone(chore.id, true);
    await afterStepDone(chore, all);
  } else if (actionIdentifier === 'later') {
    await updateChore(chore.id, { remind_at: new Date(Date.now() + 3600 * 1000).toISOString() });
  } else if (actionIdentifier === 'tomorrow') {
    // Das dritte Verschieben läuft auch hier über die Nachfrage.
    if (shouldAskBeforePostpone(chore)) {
      router.push({ pathname: '/chores', params: { postpone: chore.id } });
      return;
    }
    await postponeChore(chore, { day: addDaysStr(todayStr(), 1) });
  }
  await refreshChoreReminders();
  choreListeners.forEach((l) => l());
}

/**
 * Reagiert auf die Knöpfe in Aufgaben-Erinnerungen (Erledigt / In 1 Std. /
 * Morgen). Sie öffnen die App — ohne Hintergrund-Task (neuer Build) läuft
 * sonst kein JS. Auch die Aktion, mit der die App gerade gestartet wurde.
 */
export function listenToNotificationActions(): () => void {
  if (!Notifications) return () => {};
  const subscription = Notifications.addNotificationResponseReceivedListener((r) => {
    handleResponse(r).catch(() => {});
  });
  Notifications.getLastNotificationResponseAsync()
    .then((r) => {
      if (!r) return;
      Notifications?.clearLastNotificationResponseAsync().catch(() => {});
      return handleResponse(r);
    })
    .catch(() => {});
  return () => subscription.remove();
}
