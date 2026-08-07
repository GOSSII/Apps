import { Platform } from 'react-native';

/* expo-notifications is loaded lazily and behind try/catch on purpose:
   scheduling is unavailable in the browser preview and restricted in Expo Go
   on Android, and neither case should take the screen down with it. */

export type ReminderResult = 'ok' | 'denied' | 'unsupported';

const CHANNEL_ID = 'daily-reminder';

/* Fixed identifiers so each notification can be cancelled on its own. The
   round-end alarm and the daily nudge must never cancel each other. */
const DAILY_ID = 'padhai-daily-reminder';
const ROUND_ID = 'padhai-round-end';

async function load() {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

async function ensurePermission(Notifications: any): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function ensureChannel(Notifications: any): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Padhai Streak',
    importance: Notifications.AndroidImportance.DEFAULT
  });
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
    if (!(await ensurePermission(Notifications))) return 'denied';
    await ensureChannel(Notifications);

    // Replace rather than stack, so changing the hour leaves nothing behind.
    await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
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
    await Notifications.cancelScheduledNotificationAsync(DAILY_ID);
  } catch {
    /* nothing scheduled, or the module is unavailable — either way, done. */
  }
}

/** Fires when the running round is due to end, so the phone can be face-down
 *  for the whole 25 minutes and still tell you when they are up. */
export async function scheduleRoundEnd(
  seconds: number,
  title: string,
  body: string
): Promise<void> {
  if (!(seconds > 0)) return;
  const Notifications = await load();
  if (!Notifications) return;

  try {
    // No permission prompt here: interrupting a round to ask would be rude,
    // and the round works fine without the alarm.
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    await ensureChannel(Notifications);
    await Notifications.cancelScheduledNotificationAsync(ROUND_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: ROUND_ID,
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        repeats: false,
        channelId: CHANNEL_ID
      }
    });
  } catch {
    /* The round itself does not depend on this. */
  }
}

export async function cancelRoundEnd(): Promise<void> {
  const Notifications = await load();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(ROUND_ID);
  } catch {
    /* nothing scheduled. */
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
