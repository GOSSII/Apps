import { Platform } from 'react-native';

/* expo-notifications is loaded lazily and behind try/catch on purpose:
   scheduling is unavailable in the browser preview and restricted in Expo Go
   on Android, and neither case should take the screen down with it. */

export type ReminderResult = 'ok' | 'denied' | 'unsupported';

const CHANNEL_ID = 'daily-reminder';

async function load() {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<ReminderResult> {
  const Notifications = await load();
  if (!Notifications) return 'unsupported';

  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return 'denied';

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Daily reminder',
        importance: Notifications.AndroidImportance.DEFAULT
      });
    }

    // One reminder at a time — clear before scheduling so changing the hour
    // does not leave yesterday's trigger behind.
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID
      }
    });
    return 'ok';
  } catch {
    return 'unsupported';
  }
}

export async function cancelDailyReminder(): Promise<void> {
  const Notifications = await load();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    /* nothing scheduled, or the module is unavailable — either way, done. */
  }
}

/** '21:00' / '9:5' → {hour, minute}; null when it isn't a real clock time. */
export function parseTimeInput(text: string): { hour: number; minute: number } | null {
  const match = text.trim().match(/^(\d{1,2})[:.\s]?(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
