/* The celebration, driven through the real app.

   The logic has unit tests; what this covers is the part they cannot — that it
   actually reaches the screen at the moment the target is crossed, that it
   reaches it *over* full-screen focus mode, and above all that it does not
   come back. A celebration that replays every time the app is reopened would
   be worse than no celebration at all. */

const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:8081';
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  → ' + extra}`);
  if (!ok) failures++;
};

const TARGET_MINUTES = 240;
const TARGET = TARGET_MINUTES * 60;

const day = n => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const p = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** `days` maps "how many days ago" to seconds studied that day. */
const seed = (days = {}, extra = {}) => ({
  v: 1,
  subjects: [{ id: 's1', name: 'Physics', color: '#5B78E0' }],
  sessions: Object.entries(days).map(([ago, seconds], i) => ({
    id: 'seed' + i,
    subjectId: 's1',
    day: day(Number(ago)),
    seconds,
    endedAt: Date.now() - Number(ago) * 86400000,
    planned: true
  })),
  dailyTargetMinutes: TARGET_MINUTES,
  exam: null, active: null, lang: 'en',
  reminder: { enabled: false, hour: 21, minute: 0 },
  pomodoro: { preset: 'standard', focusMinutes: 25, breakMinutes: 5 },
  themePref: 'light',
  celebratedDay: null,
  ...extra
});

const run = [];
for (let i = 0; i < 6; i++) run[i + 1] = TARGET;

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => {
    const txt = m.text();
    if (m.type() === 'error' && !txt.includes('Download the React DevTools')) errors.push(txt);
  });

  const load = async (state) => {
    await page.evaluate(s => localStorage.setItem('padhai-streak:v1', JSON.stringify(s)), state);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1300);
  };

  const showing = () => page.getByTestId('celebration').isVisible().catch(() => false);
  const titleText = () => page.getByTestId('celebration-title').textContent().catch(() => '');
  const storedDay = () => page.evaluate(() =>
    JSON.parse(localStorage.getItem('padhai-streak:v1') || '{}').celebratedDay ?? null);

  /** Adds minutes through the app's own manual-entry sheet. */
  const logMinutes = async (minutes) => {
    await page.getByTestId('log-manually').click();
    await page.waitForTimeout(300);
    await page.getByTestId('manual-minutes').fill(String(minutes));
    await page.getByTestId('manual-add').click();
    await page.waitForTimeout(700);
  };

  console.log('bundling…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByText('Today', { exact: true }).first().waitFor({ timeout: 180000 });

  // ---- a day short of the target is not a celebration ----
  await load(seed({ 0: TARGET - 600 }));
  check('nothing fires while the target is still short', (await showing()) === false);
  check('and nothing is recorded as celebrated', (await storedDay()) === null);

  // ---- crossing it, in the app, fires once ----
  await logMinutes(10);
  check('crossing the target celebrates', (await showing()) === true);
  check('the first target ever met is named as such',
    (await titleText()) === 'First day done', await titleText());
  check('the card carries the day\'s total',
    await page.getByText('4h studied today.').isVisible());
  check('the card carries the streak',
    (await page.getByTestId('celebration-streak').textContent()) === '🔥 1 day');
  await page.screenshot({ path: 'shot-celebrate-first.png' });

  // ---- dismissing, and never seeing it again ----
  await page.getByTestId('celebration-dismiss').click();
  await page.waitForTimeout(500);
  check('it can be dismissed', (await showing()) === false);
  check('the day is banked so it cannot come back',
    (await storedDay()) === day(0), String(await storedDay()));

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  check('reopening the app that evening does not replay it', (await showing()) === false);
  check('the dial still shows the day was hit',
    await page.getByText(/Target done/).isVisible());

  // ---- an ordinary good day, after the first ----
  await load(seed({ 0: TARGET - 60, 2: TARGET, 3: TARGET }));
  await logMinutes(1);
  check('an ordinary good day still gets marked',
    (await titleText()) === 'Target done', await titleText());
  await page.getByTestId('celebration-dismiss').click();
  await page.waitForTimeout(400);

  // ---- a milestone streak gets its own headline ----
  await load(seed({ ...run, 0: TARGET - 60 }));
  await logMinutes(1);
  check('a seventh day in a row is a milestone',
    (await titleText()) === '7-day streak', await titleText());
  check('the milestone card says what the run means',
    await page.getByText(/7 days without a gap/).isVisible());
  check('the streak pill agrees with the headline',
    (await page.getByTestId('celebration-streak').textContent()) === '🔥 7 days');
  await page.screenshot({ path: 'shot-celebrate-streak.png' });
  await page.getByTestId('celebration-dismiss').click();
  await page.waitForTimeout(400);

  // ---- it reaches the screen over full-screen focus mode ----
  /* The target is usually crossed by the round that is still on screen, so an
     overlay that only worked on the dashboard would miss the common case. */
  await load(seed({ 0: TARGET - 60 }, {
    active: {
      subjectId: 's1',
      runningSince: Date.now() - 120_000,
      bankedSeconds: 0,
      pausedAt: null,
      plannedSeconds: 60,
      kind: 'focus',
      distractions: 0,
      round: 1
    }
  }));
  check('the finished round is waiting in focus mode',
    await page.getByText('Round complete').isVisible());
  check('no celebration before the round is banked', (await showing()) === false);
  await page.getByTestId('focus-done').click();
  await page.waitForTimeout(800);
  check('finishing the round that crosses the target celebrates over focus mode',
    (await showing()) === true);
  await page.getByTestId('celebration-dismiss').click();
  await page.waitForTimeout(400);

  // ---- restoring a backup taken on a day already hit does not re-fire ----
  await load(seed({ 0: TARGET }, { celebratedDay: day(0) }));
  check('a state that says today was already celebrated stays quiet',
    (await showing()) === false);

  // ---- but one that was never celebrated is still owed ----
  await load(seed({ 0: TARGET }));
  check('a target hit but never celebrated is still owed on open',
    (await showing()) === true);
  await page.getByTestId('celebration-dismiss').click();
  await page.waitForTimeout(400);

  // ---- Hindi ----
  await load(seed({ 0: TARGET - 60, 2: TARGET }, { lang: 'hi' }));
  await page.getByTestId('log-manually').click();
  await page.waitForTimeout(300);
  await page.getByTestId('manual-minutes').fill('1');
  await page.getByTestId('manual-add').click();
  await page.waitForTimeout(700);
  check('the celebration is translated',
    (await titleText()) === 'लक्ष्य पूरा', await titleText());
  check('so is the button',
    await page.getByText('आगे बढ़ते रहें').isVisible());

  check('no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log(failures ? `\n${failures} failing check(s)` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
