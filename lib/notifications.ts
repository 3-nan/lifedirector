import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { targetOf } from './habits';
import { notificationCopy } from './motivation';
import { daysAgoStr, todayStr } from './period';
import { supabase } from './supabase';

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
 * deshalb erst alle alten geplanten Erinnerungen löschen (sonst stapeln
 * sich Duplikate mit veraltetem Text).
 */
export async function setupDailyReminder() {
  if (!Notifications) return;
  try {
    if (!Device.isDevice) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    const weeklyRate = await computeWeeklyRate();
    const { title, body } = notificationCopy(weeklyRate, todayStr());

    await Notifications.scheduleNotificationAsync({
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
