/* First run, driven the way a first run actually happens: an empty phone.

   The important half is what happens *after* — that the answers reach the app,
   and that it never comes back. An onboarding flow someone has to sit through
   twice is worse than none at all. */

const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:8081';
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  → ' + extra}`);
  if (!ok) failures++;
};

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

  const fresh = async () => {
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1400);
  };
  const stored = () => page.evaluate(() =>
    JSON.parse(localStorage.getItem('padhai-streak:v1') || '{}'));
  const title = () => page.getByTestId('ob-title').textContent().catch(() => '');
  const onDashboard = () => page.getByTestId('start-focus').isVisible().catch(() => false);

  console.log('bundling…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('ob-title').waitFor({ timeout: 180000 });

  // ---- an empty phone lands on step one, not on an empty dashboard ----
  await fresh();
  check('a fresh install opens on onboarding', (await title()) === 'Padhai Streak');
  check('the tab bar is not offered yet',
    (await page.getByTestId('tab-stats').isVisible().catch(() => false)) === false);
  check('the step is stated', await page.getByText('Step 1 of 4').isVisible());
  await page.screenshot({ path: 'shot-onboarding.png' });

  // ---- language is asked first, and applies immediately ----
  await page.getByTestId('ob-lang-hi').click();
  await page.waitForTimeout(500);
  check('choosing हिंदी translates the flow it is standing in',
    await page.getByText('आगे').isVisible());
  await page.getByTestId('ob-lang-en').click();
  await page.waitForTimeout(400);
  check('and switching back works', await page.getByText('Next', { exact: true }).isVisible());

  // ---- exam ----
  await page.getByTestId('ob-next').click();
  await page.waitForTimeout(500);
  check('step two asks what you are preparing for',
    (await title()) === 'What are you preparing for?');
  /* Two exams starting "JEE" must be separately addressable — slugging on the
     first word alone gave them the same id. */
  check('every exam chip has its own id',
    (await page.getByTestId('ob-exam-jee-mains').count()) === 1
    && (await page.getByTestId('ob-exam-jee-advanced').count()) === 1);
  await page.getByTestId('ob-exam-neet').click();
  await page.waitForTimeout(300);
  check('a quick pick fills the name',
    (await page.getByTestId('ob-exam-name').inputValue()) === 'NEET');

  // A name without a date is a half-answer, and must not pass silently.
  await page.getByTestId('ob-next').click();
  await page.waitForTimeout(400);
  check('a named exam with no date is refused, not silently dropped',
    await page.getByTestId('ob-error').isVisible());
  check('and the step does not advance',
    (await title()) === 'What are you preparing for?');

  await page.getByTestId('ob-exam-date').fill('03/05/2027');
  await page.getByTestId('ob-next').click();
  await page.waitForTimeout(500);
  check('a complete exam moves on', (await title()) === 'How long each day?');

  // ---- target ----
  check('the target starts at the default', (await page.getByTestId('ob-target').textContent()) === '4h');
  await page.getByTestId('ob-target-360').click();
  await page.waitForTimeout(400);
  check('a quick pick sets the target', (await page.getByTestId('ob-target').textContent()) === '6h');

  // ---- back does not lose what was typed ----
  await page.getByTestId('ob-back').click();
  await page.waitForTimeout(400);
  check('going back keeps the exam name',
    (await page.getByTestId('ob-exam-name').inputValue()) === 'NEET');
  check('and its date', (await page.getByTestId('ob-exam-date').inputValue()) === '03/05/2027');
  await page.getByTestId('ob-next').click();
  await page.waitForTimeout(400);

  // ---- subjects ----
  await page.getByTestId('ob-next').click();
  await page.waitForTimeout(500);
  check('the last step asks what you study', (await title()) === 'What do you study?');
  await page.getByTestId('ob-subject-physics').click();
  await page.getByTestId('ob-subject-chemistry').click();
  await page.getByTestId('ob-subject-biology').click();
  await page.waitForTimeout(500);
  check('subjects are added as they are tapped',
    (await page.getByTestId('ob-added').textContent()) === '3 added');

  // ---- and out ----
  await page.getByTestId('ob-next').click();
  await page.waitForTimeout(900);
  check('finishing lands on the dashboard', await onDashboard());

  const saved = await stored();
  check('the exam reached the app', saved.exam?.name === 'NEET', JSON.stringify(saved.exam));
  check('so did its date', saved.exam?.date === '2027-05-03', JSON.stringify(saved.exam));
  check('so did the target', saved.dailyTargetMinutes === 360, String(saved.dailyTargetMinutes));
  check('so did the subjects', saved.subjects?.length === 3, String(saved.subjects?.length));
  check('and the run is recorded as done', saved.onboarded === true);

  check('the countdown the exam was for is on the home screen',
    await page.getByText(/NEET · \d+ days/).isVisible());

  // ---- it never comes back ----
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  check('reopening the app does not run it again', await onDashboard());

  // ---- skipping is a real option, and still gets you a usable app ----
  await fresh();
  await page.getByTestId('ob-skip').click();
  await page.waitForTimeout(900);
  check('skip goes straight to the app',
    (await page.getByTestId('tab-today').isVisible()));
  const skipped = await stored();
  check('a skipped run is still a finished run', skipped.onboarded === true);
  check('and leaves the sensible default target', skipped.dailyTargetMinutes === 240);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  check('a skipped run does not come back either',
    (await page.getByTestId('tab-today').isVisible()));

  // ---- someone already using the app is never shown it ----
  /* The upgrade case: a save written before onboarding existed carries no
     flag, and its owner has been using the app for weeks. */
  await page.evaluate(() => localStorage.setItem('padhai-streak:v1', JSON.stringify({
    v: 1,
    subjects: [{ id: 's1', name: 'Physics', color: '#5B78E0' }],
    sessions: [{ id: 'a', subjectId: 's1', day: '2026-08-01', seconds: 3600, endedAt: 1 }],
    dailyTargetMinutes: 240, exam: null, active: null, lang: 'en',
    reminder: { enabled: false, hour: 21, minute: 0 },
    pomodoro: { preset: 'standard', focusMinutes: 25, breakMinutes: 5 }
  })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  check('an upgrade from before onboarding skips it entirely', await onDashboard());
  check('and keeps the history it already had',
    (await stored()).sessions.length === 1);

  // ---- erasing your data is not the same as being a new user ----
  /* Adding onboarding made this a real risk: emptyState() has the flag off, so
     "Erase all data" would have thrown an existing user into a four-step
     wizard for tapping a button that promised to clear their history. */
  await page.getByTestId('tab-settings').click();
  await page.waitForTimeout(500);
  await page.getByText('Erase all data').click();
  await page.waitForTimeout(400);
  await page.getByText('Erase', { exact: true }).click();
  await page.waitForTimeout(900);
  check('erasing all data does not re-run onboarding',
    (await page.getByTestId('tab-today').isVisible()));
  check('and the app is genuinely empty afterwards',
    (await stored()).sessions.length === 0);

  check('no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log(failures ? `\n${failures} failing check(s)` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
