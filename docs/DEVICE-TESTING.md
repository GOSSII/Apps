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
| Cold-start the app on a light phone | A lavender splash with the clock mark, then the app — no white flash, no jump in ground colour |
| Cold-start it with the phone in dark mode | A near-black splash, then a dark app — the splash must not flash light first |
| Look at the home-screen icon | The clock mark on violet, correctly masked on Android (circle/squircle per launcher) |
| A notification arrives | The small icon is the clock silhouette, tinted violet — not a grey square |
| Use it on a notched phone | Nothing sits under the notch or the home indicator; the tab bar clears the gesture bar |
| Switch to हिंदी on a small (320dp) screen | No clipped or overlapping labels, especially "फ़ोकस शुरू करें" and the round presets |
| Watch the dial while a round runs | The digits do not jitter as the seconds tick |
| Turn on TalkBack and swipe through the dashboard | Every control is announced with a name; the chosen subject says it is selected |
| Look at the 12-week calendar | The weekday letters line up exactly with the rows of squares, at every screen width |
| Switch to हिंदी and look at it again | The letters are र/सो/मं/बु/गु/शु/श, and the two-character ones are not clipped |
| Open Stats on a phone with study only from months ago | The grid says it is empty rather than showing 84 identical squares |

### First run

| Do this | Expect |
| --- | --- |
| Install fresh and open it | Setup, not an empty dashboard — and no tab bar to wander into yet |
| Pick हिंदी on step one | The rest of the flow is in Hindi immediately, including the buttons |
| Type an exam date with the phone keyboard | The field takes 24/05/2027 and the countdown appears on the home screen afterwards |
| Tap Skip on any step | Straight into the app, on a 4h default target, and it never comes back |
| Kill the app mid-setup and reopen | Setup resumes from the start — nothing half-saved |
| Upgrade over an existing install | No setup at all; your subjects and history are untouched |
| Settings → Erase all data | The app empties but does **not** re-run setup |

### The target celebration

The rules are unit-tested and driven in a browser. What is left for a phone is
whether it *feels* like a moment rather than an interruption.

| Do this | Expect |
| --- | --- |
| Study past the daily target for the first time | Confetti and "First day done" — and the streak reads 1 day |
| Finish the round that crosses the target, while still in focus mode | The card appears over the full-screen dial, not behind it |
| Let it sit without touching anything | It clears itself after a few seconds; the confetti has landed by then, nothing is frozen mid-air |
| Cross the target, dismiss, then reopen the app that evening | Nothing. This is the one that matters — a celebration that replays is a popup |
| Force-quit mid-confetti, then reopen | Still nothing: the day is banked when the card appears, not when it is dismissed |
| Cross the target on a seventh consecutive day | "7-day streak" with its own line, not the ordinary card |
| Turn on Reduce Motion (iOS: Accessibility → Motion; Android: Remove animations), then cross the target | The message appears with no falling pieces — not slowed-down ones |
| Cross the target while a break is running | The break clock keeps correct time underneath; the confetti does not stall it |
| Restore a backup taken on a day already celebrated | No celebration on the new phone |
| Turn on TalkBack and cross the target | The card is announced when it appears |

### Dark mode

The palette is checked numerically by `src/__tests__/theme.test.ts`, so what is
left for a phone is the things a contrast ratio cannot tell you.

| Do this | Expect |
| --- | --- |
| Settings → Appearance → Dark | Everything repaints at once, including the tab bar and the status-bar glyphs (which go light) |
| Leave it on System and flip the phone's own dark mode | The app follows, without a restart |
| Set it to Light, then turn the phone dark | The app stays light — an explicit choice beats the system |
| Choose Dark, force-quit, reopen | Still dark, and the splash is dark too |
| In dark, open any sheet — Custom round, Edit sitting, Erase | The sheet is clearly in front of the page, not floating on a ground the same colour |
| In dark, look at the subject dots and the by-subject bars | Each is clearly visible against the card, none has gone muddy |
| In dark, look at a subject added *before* this version | Its dot is one of the current colours, not the old flat indigo |
| In dark on OLED, run a round with the screen on for 25 minutes | No visible smearing or banding on the dial |
| In dark, read the chart | The dashed target line is visible, and the "hit" bars are distinguishable from the "missed" ones |
| In dark, cross the daily target | The confetti is clearly visible against the near-black ground |

## Reporting back

For anything that differs, the useful details are: the device and OS version,
whether it was Expo Go or a build, and what happened instead. Most of these
map to a single file — notifications to `src/lib/notifications.ts`,
distraction counting to the `AppState` listener in `src/store.tsx`, first run
to `src/screens/OnboardingScreen.tsx` (and the `onboarded` rule in
`src/lib/storage.ts`), backup to
`src/lib/backupTransport.ts`, and the celebration to `src/lib/celebrate.ts`
(when) plus `src/components/Celebration.tsx` (what it looks like).
