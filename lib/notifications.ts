import * as Device from 'expo-device';
import { Platform } from 'react-native';

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

    // Vorherige geplante Erinnerungen entfernen, um Duplikate zu vermeiden
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Habit-Check',
        body: 'Zeit für deinen täglichen Check-in.',
      },
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
