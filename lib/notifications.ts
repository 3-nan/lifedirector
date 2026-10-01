import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupDailyReminder() {
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
}