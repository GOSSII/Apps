# Device testing

Everything in this app has been verified through `react-native-web` in a
headless browser. That covers the logic and most of the UI, and it cannot
cover the list below — a browser tab has no notifications, never truly goes
to the background, and has no share sheet.

**Nothing here has run on a phone yet.** This is the checklist for the first
time it does.

## Get it on a phone

Fastest, no account needed:

```sh
npm install
npx expo start        # scan the QR with Expo Go
```

Expo Go is enough for most of this list. Two rows below are marked **needs a
build**, because Expo Go on Android cannot schedule local notifications since
SDK 53. For those, build an installable APK (free Expo account):

```sh
npm install -g eas-cli
eas login
eas build -p android --profile preview     # APK, install directly
```

## What to check

Each row says what to do and what should happen. If something differs, that is
a real finding — the browser could not have caught it.

### Timer and rounds

| Do this | Expect |
| --- | --- |
| Start a Classic 25/5 round, lock the phone, wait a minute, unlock | The dial has advanced by the time that passed — the clock is timestamps, not ticks |
| Start a round, switch to another app, come back | Under the dial: "You left the app once" |
| Switch away and back three times | "You left the app 3 times" — not 6, and not 1 |
| Open the notification shade and close it without leaving the app | Ideally *not* counted (iOS reports this as `inactive`, which should not count as leaving) |
| Start a round and leave the phone untouched for 2 minutes | The screen stays awake for the whole round |
| Start a 1-minute custom round, leave the app, wait | **Needs a build:** a notification arrives when the round is up |
| Let a round finish, force-quit the app, reopen | The finished round is still waiting with its time intact |
| Start a round at 23:58 with a 5-minute length, let it end, save it the next morning | It lands on *yesterday*, and yesterday's streak holds |

### Notifications

| Do this | Expect |
| --- | --- |
| Settings → Daily reminder → set a time two minutes out → Turn on | **Needs a build:** Android 13+ asks for notification permission first, then the reminder fires at that time |
| Deny the permission, then try again | The app says notifications are blocked and points at phone settings — it does not claim the reminder is on |
| In Expo Go on Android | The app says reminders need the installed app, rather than silently doing nothing |
| Turn the reminder on, then switch the app to हिंदी | The next reminder arrives in Hindi |
| With a reminder set, start a round | Both survive — setting one does not cancel the other |

### Backup

| Do this | Expect |
| --- | --- |
| Settings → Backup → Save a backup | The share sheet opens with `padhai-streak-<date>.json` — save it to Drive or send it to yourself |
| Open that file | Readable JSON, with your subjects and sittings, and `"active": null` |
| Erase all data, then Restore → Choose a file → pick it | It says how many sittings it holds before overwriting; after restoring, the history is back |
| Restore while a round is running | The round is not carried across |

### Look and feel

| Do this | Expect |
| --- | --- |
| Cold-start the app | A dark splash with the clock mark — not a white flash |
| Look at the home-screen icon | The clock mark on violet, correctly masked on Android (circle/squircle per launcher) |
| A notification arrives | The small icon is the clock silhouette, tinted violet — not a grey square |
| Use it on a notched phone | Nothing sits under the notch or the home indicator; the tab bar clears the gesture bar |
| Switch to हिंदी on a small (320dp) screen | No clipped or overlapping labels, especially "फ़ोकस शुरू करें" and the round presets |
| Watch the dial while a round runs | The digits do not jitter as the seconds tick |
| Turn on TalkBack and swipe through the dashboard | Every control is announced with a name; the chosen subject says it is selected |

## Reporting back

For anything that differs, the useful details are: the device and OS version,
whether it was Expo Go or a build, and what happened instead. Most of these
map to a single file — notifications to `src/lib/notifications.ts`,
distraction counting to the `AppState` listener in `src/store.tsx`, backup to
`src/lib/backupTransport.ts`.
