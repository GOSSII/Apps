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
node e2e/run-app.js        # 37 checks: rounds, breaks, stats, editing, Hindi
node e2e/run-midnight.js   #  8 checks: the day rollover, on a faked clock
```

`run-midnight.js` installs a fake clock at 23:59:30 and fast-forwards past
midnight with the app left open — the way an aspirant actually uses it at 1am.

Both scripts expect a Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
Change `executablePath` at the top of each file to point at your own, or drop
the option entirely if you install full `playwright` instead of `playwright-core`.

Metro caches aggressively: after changing source, restart the dev server with
`--clear` before trusting a run. Several apparent passes in development turned
out to be stale bundles.
