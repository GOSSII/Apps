# End-to-end checks

These drive the real app in a headless browser through `react-native-web`.
They are plain Node scripts rather than a test-runner suite, because they need
a Metro dev server running alongside them and each is a single long user
journey rather than a set of independent cases.

```sh
# terminal 1 — serve the app
npx expo start --web --port 8081

# terminal 2 — drive it
npm install --no-save playwright-core
node e2e/run-app.js        # 43 checks: rounds, breaks, stats, editing, Hindi
node e2e/run-midnight.js   #  9 checks: the day rollover, on a faked clock
node e2e/run-a11y.js       # 12 checks: names, roles, states, touch targets
node e2e/run-backup.js     # 12 checks: saving a file, and restoring from one
node e2e/run-theme.js      # 15 checks: dark mode, and following the OS
node e2e/run-celebrate.js  # 22 checks: the target celebration, and its silence
```

`run-a11y.js` reads the rendered DOM. react-native-web maps accessibility
props onto ARIA, so what it sees is a fair proxy for what TalkBack sees on the
device — it is how we found that react-native-web does not translate
`accessibilityState` into ARIA at all, and that the row actions were 31px tall.

`run-theme.js` opens the app twice, once in a context with
`colorScheme: 'light'` and once `'dark'`, and reads the painted background out
of `getComputedStyle` rather than trusting the token file — the palette itself
has unit tests, so what this covers is the wiring. It is also where the subject
colour migration is proved end to end: the seed carries a subject in the old
flat indigo, and the check is that no such dot survives to the screen.

`run-celebrate.js` is mostly about the celebration *not* happening. Firing is
one check; the rest are the ways it must stay quiet — a day still short of the
target, a day already celebrated, a reload that evening, a state restored from
a phone where it was already seen, and the midnight rollover. Getting any of
those wrong turns the one moment the app exists for into a popup people learn
to dismiss.

`run-midnight.js` installs a fake clock at 23:59:30 and fast-forwards past
midnight with the app left open — the way an aspirant actually uses it at 1am.

All six scripts expect a Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
Change `executablePath` at the top of each file to point at your own, or drop
the option entirely if you install full `playwright` instead of `playwright-core`.

Metro caches aggressively: after changing source, restart the dev server with
`--clear` before trusting a run. Several apparent passes in development turned
out to be stale bundles.
