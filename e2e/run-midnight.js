/* The app is used past midnight more than most. This drives a fake clock
   across the boundary with the app left open, which is exactly how an
   aspirant uses it at 1am. */

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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  // 10 Aug 2026, half a minute before midnight, local time.
  await page.clock.install({ time: new Date(2026, 7, 10, 23, 59, 30) });

  console.log('bundling…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  /* A blank profile is a first run now, so wait for whichever of the two
     the app legitimately opens on. */
  await page.locator('[data-testid="ob-title"], [data-testid="tab-today"]')
    .first().waitFor({ timeout: 180000 });

  await page.evaluate(() => {
    localStorage.setItem('padhai-streak:v1', JSON.stringify({
      v: 1,
      subjects: [{ id: 's1', name: 'Physics', color: '#3552CC' }],
      sessions: [
        // Four hours on the 9th and four on the 10th: a live two-day streak.
        { id: 'a', subjectId: 's1', day: '2026-08-09', seconds: 14400, endedAt: 1 },
        { id: 'b', subjectId: 's1', day: '2026-08-10', seconds: 14400, endedAt: 2 }
      ],
      dailyTargetMinutes: 240,
      exam: null, active: null, lang: 'en',
      reminder: { enabled: false, hour: 21, minute: 0 },
      pomodoro: { preset: 'standard', focusMinutes: 25, breakMinutes: 5 },
      /* The target was hit hours ago and the celebration already seen — which
         is the realistic state at 23:59, and keeps this test about midnight. */
      celebratedDay: '2026-08-10'
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  check('before midnight the dial shows the night\'s work',
    (await page.getByTestId('dial-total').textContent()) === '4h');
  check('before midnight the streak counts both days',
    await page.getByText(/🔥 2 days/).isVisible());

  // Cross midnight with the app sitting open on the dashboard.
  await page.clock.fastForward('02:00');
  await page.waitForTimeout(1200);

  const totalAfter = await page.getByTestId('dial-total').textContent();
  check('after midnight the dial resets to the new day', totalAfter === '0m', totalAfter);
  const leftAfter = await page.getByTestId('dial-remaining').textContent();
  check('after midnight the target is owed again', leftAfter === '4h to go', leftAfter);
  check('the streak survives the rollover — yesterday still counts',
    await page.getByText(/🔥 2 days/).isVisible());
  /* The new day has nothing in it, so nothing has been earned in it. A
     rollover that re-fired last night's confetti would be the worst possible
     way to be woken at 00:01. */
  check('the rollover does not replay last night\'s celebration',
    (await page.getByTestId('celebration').isVisible().catch(() => false)) === false);

  // And the chart's "today" column moves with it.
  await page.getByTestId('tab-stats').click();
  await page.waitForTimeout(800);
  check('stats follow the rollover too',
    await page.getByText('Target hit').isVisible());
  const weekTotal = await page.locator('text=/^8h$/').first().isVisible().catch(() => false);
  check('the last seven days still include both study days', weekTotal);

  check('no runtime errors', errors.length === 0, errors.slice(0, 2).join(' | '));

  await browser.close();
  console.log(failures ? `\n${failures} failing check(s)` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
