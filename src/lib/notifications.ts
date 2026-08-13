import { Platform } from 'react-native';

/* expo-notifications is loaded lazily and behind try/catch on purpose:
   scheduling is unavailable in the browser preview and restricted in Expo Go
   on Android, and neither case should take the screen down with it. */

export type ReminderResult = 'ok' | 'denied' | 'unsupported';

/* A channel per kind, not one for everything: a user who silences the nightly
   reminder should not also lose the alarm that ends their round. */
const REMINDER_CHANNEL = 'daily-reminder';
/* Versioned because Android freezes a channel's importance the moment it is
   created and refuses every later change — the original 'round-end' channel
   was registered at DEFAULT, which is the difference between an alarm that
   interrupts and one that waits silently in the shade. A new id is the only
   way to ship the fix to anyone who already has the app. */
const ROUND_CHANNEL = 'round-end-v2';
const NUDGE_CHANNEL = 'study-nudges';

/* Fixed identifiers so each notification can be cancelled on its own. They
   must never cancel each other. */
const DAILY_ID = 'padhai-daily-reminder';
const ROUND_ID = 'padhai-round-end';
const NEGLECT_ID = 'padhai-neglect-nudge';
const STREAK_ID = 'padhai-streak-risk';

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

/** Whether notifications are already allowed. Never prompts — the background
 *  nudges use this so that the first thing a new install does is not throw a
 *  permission dialog at someone who has not asked for one. */
export async function notificationsAllowed(): Promise<boolean> {
  const Notifications = await load();
  if (!Notifications) return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted === true;
  } catch {
    return false;
  }
}

type Importance = 'default' | 'high';

async function ensureChannel(
  Notifications: any,
  id: string,
  name: string,
  importance: Importance = 'default'
): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(id, {
    name,
    importance: importance === 'high'
      ? Notifications.AndroidImportance.HIGH
      : Notifications.AndroidImportance.DEFAULT
  });
}

/* Without a handler, a notification that arrives while the app is open is
   delivered to nothing — which is precisely the round-end alarm's situation
   when the user is looking at another screen of this app. Installed once,
   lazily, so the browser never touches the module. */
let handlerInstalled = false;
export async function installNotificationHandler(): Promise<void> {
  if (handlerInstalled) return;
  const Notifications = await load();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false
      })
    });
    handlerInstalled = true;
  } catch {
    /* Nothing else depends on this. */
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
    if (!(await ensurePermission(Notifications))) return 'denied';
    await ensureChannel(Notifications, REMINDER_CHANNEL, 'Daily reminder');

    // Replace rather than stack, so changing the hour leaves nothing behind.
    await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: REMINDER_CHANNEL
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
    /* Asking here is asking at the start of a round, not during one — and
       without it the alarm would never fire for anyone who has not also
       turned on the daily reminder, which is most people. A refusal is
       accepted quietly: the round itself does not need the alarm. */
    if (!(await ensurePermission(Notifications))) return;
    /* High, so it arrives as a heads-up banner with a sound. This one exists
       to be noticed from across the room with the phone face down; delivered
       silently to the shade it does nothing at all. */
    await ensureChannel(Notifications, ROUND_CHANNEL, 'Round finished', 'high');
    await Notifications.cancelScheduledNotificationAsync(ROUND_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: ROUND_ID,
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        repeats: false,
        channelId: ROUND_CHANNEL
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

/* ---- the two background nudges -------------------------------------------

   Both are one-shot, both are cancelled and rebuilt from live state whenever
   anything they depend on changes, and neither ever asks for permission: they
   are scheduled only when it has already been granted for something the user
   did ask for. A nudge that prompts is a nudge that gets the whole app muted. */

async function scheduleOneShot(
  id: string,
  channel: string,
  channelName: string,
  seconds: number,
  title: string,
  body: string
): Promise<void> {
  const Notifications = await load();
  if (!Notifications) return;
  try {
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    await ensureChannel(Notifications, channel, channelName);
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    if (!(seconds > 0)) return;
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        repeats: false,
        channelId: channel
      }
    });
  } catch {
    /* Nothing on screen depends on this. */
  }
}

async function cancelOne(id: string): Promise<void> {
  const Notifications = await load();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* nothing scheduled. */
  }
}

/** "You haven't opened Chemistry in 9 days." */
export async function scheduleNeglectNudge(
  seconds: number, title: string, body: string
): Promise<void> {
  await scheduleOneShot(NEGLECT_ID, NUDGE_CHANNEL, 'Study nudges', seconds, title, body);
}

export const cancelNeglectNudge = () => cancelOne(NEGLECT_ID);

/** "Your 12-day streak ends at midnight." */
export async function scheduleStreakRisk(
  seconds: number, title: string, body: string
): Promise<void> {
  await scheduleOneShot(STREAK_ID, NUDGE_CHANNEL, 'Study nudges', seconds, title, body);
}

export const cancelStreakRisk = () => cancelOne(STREAK_ID);

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
