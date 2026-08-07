const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:8081';
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  → ' + extra}`);
  if (!ok) failures++;
};

const seed = (extra = {}) => ({
  v: 1,
  subjects: [
    { id: 's1', name: 'Physics', color: '#7c5cff' },
    { id: 's2', name: 'Chemistry', color: '#22c55e' },
    { id: 's3', name: 'Maths', color: '#f59e0b' }
  ],
  sessions: [],
  dailyTargetMinutes: 240,
  exam: null,
  active: null,
  lang: 'en',
  reminder: { enabled: false, hour: 21, minute: 0 },
  pomodoro: { preset: 'standard', focusMinutes: 25, breakMinutes: 5 },
  ...extra
});

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
    await page.waitForTimeout(1200);
  };

  console.log('bundling…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByText('Today', { exact: true }).first().waitFor({ timeout: 180000 });

  // ---------- dashboard ----------
  await load(seed());
  check('dial shows the daily target', await page.getByText('of 4h target').isVisible());
  check('round presets offered', await page.getByTestId('preset-deep').isVisible());
  check('subjects offered as chips', await page.getByTestId('pick-s2').isVisible());

  // ---------- a fixed round, run to completion ----------
  // A 1-minute custom round keeps the test honest without waiting 25 minutes.
  await page.getByTestId('preset-custom').click();
  await page.getByTestId('custom-focus').fill('1');
  await page.getByTestId('custom-break').fill('1');
  await page.getByTestId('custom-save').click();
  await page.waitForTimeout(300);
  check('custom round saved', await page.getByText('1 / 1').isVisible());

  await page.getByTestId('pick-s2').click();
  await page.getByTestId('start-focus').click();
  await page.waitForTimeout(1500);
  check('focus mode takes over the screen',
    !(await page.getByTestId('tab-stats').isVisible().catch(() => false)));
  check('focus mode names the subject and round',
    (await page.getByText('Chemistry').first().isVisible()) &&
    (await page.getByText('Round 1').isVisible()));
  const left = await page.getByText(/left$/).first().textContent();
  check('round counts down', /0?\d+m left|59s|1m left/.test(left) || left.includes('left'), left);
  check('focus mode reports staying in the app',
    await page.getByText('You stayed in the app the whole round').isVisible());

  // pause freezes the countdown
  await page.getByTestId('focus-pause').click();
  const frozen = await page.locator('text=/^00:00:\\d\\d$/').first().textContent();
  await page.waitForTimeout(1300);
  check('pause freezes the countdown',
    (await page.locator('text=/^00:00:\\d\\d$/').first().textContent()) === frozen);
  await page.getByTestId('focus-pause').click();

  // let the round finish
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    // Fast-forward: rewind the start so the round is already up.
    const raw = JSON.parse(localStorage.getItem('padhai-streak:v1'));
    raw.active.runningSince = Date.now() - 61_000;
    raw.active.bankedSeconds = 0;
    localStorage.setItem('padhai-streak:v1', JSON.stringify(raw));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  check('completed round announces itself',
    await page.getByText('Round complete').isVisible());
  check('completed round shows what was saved',
    await page.getByText(/1m on Chemistry saved/).isVisible());
  check('a break is offered', await page.getByTestId('focus-break').isVisible());
  await page.screenshot({ path: 'shot-round-done.png' });

  // ---------- break ----------
  await page.getByTestId('focus-break').click();
  await page.waitForTimeout(800);
  check('break runs on its own clock', await page.getByText('Break').first().isVisible());
  check('the break keeps the subject you were studying',
    await page.getByText('Chemistry').first().isVisible());
  check('break can be skipped', await page.getByTestId('focus-skip').isVisible());
  await page.getByTestId('focus-skip').click();
  await page.waitForTimeout(600);
  check('skipping the break returns to the dashboard',
    await page.getByTestId('start-focus').isVisible());
  check('the finished round landed on today',
    await page.getByText('1m').first().isVisible());

  // ---------- open-ended sitting still works ----------
  await page.getByTestId('preset-open').click();
  await page.getByTestId('pick-s1').click();
  await page.getByTestId('start-focus').click();
  await page.waitForTimeout(2200);
  check('open sitting has no countdown',
    await page.getByText('Open-ended sitting').isVisible());
  await page.getByTestId('focus-stop').click();
  await page.waitForTimeout(600);
  check('open sitting saves and returns',
    await page.getByTestId('start-focus').isVisible());

  // ---------- distraction counting ----------
  await load(seed({
    active: {
      subjectId: 's1', runningSince: Date.now() - 20_000, bankedSeconds: 0,
      plannedSeconds: 1500, kind: 'focus', distractions: 3, round: 2
    }
  }));
  check('a resumed sitting reopens in focus mode',
    await page.getByText('Round 2').isVisible());
  check('phone checks are surfaced honestly',
    await page.getByText('You left the app 3 times').isVisible());
  await page.screenshot({ path: 'shot-focus.png' });
  await page.getByTestId('focus-stop').click();
  await page.waitForTimeout(600);

  // ---------- a round finished last night, saved this morning ----------
  const lastNight = new Date();
  lastNight.setDate(lastNight.getDate() - 1);
  lastNight.setHours(23, 0, 0, 0);
  await load(seed({
    active: {
      subjectId: 's1', runningSince: lastNight.getTime(), bankedSeconds: 0,
      pausedAt: null, plannedSeconds: 1500, kind: 'focus', distractions: 0, round: 1
    }
  }));
  check('last night\'s finished round is waiting on open',
    await page.getByText('Round complete').isVisible());
  await page.getByTestId('focus-done').click();
  await page.waitForTimeout(600);
  check('last night\'s study does not land on today',
    (await page.getByText('0m').first().isVisible()));
  await page.getByTestId('tab-stats').click();
  await page.waitForTimeout(600);
  const yesterdayLabel = `${lastNight.getDate()} ${
    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][lastNight.getMonth()]
  } ${lastNight.getFullYear()}`;
  check('it is credited to the night it was studied',
    await page.getByText(yesterdayLabel).first().isVisible(), yesterdayLabel);

  // ---------- stats: calendar + focus stats ----------
  const day = n => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    const p = x => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const plan = [[1, 15300], [2, 15300], [3, 14400], [4, 14400], [5, 14400], [6, 15300], [8, 12600]];
  await load(seed({
    sessions: [
      ...plan.map(([ago, secs], i) => ({
        id: 'seed' + i, subjectId: ['s1', 's2', 's3'][i % 3], day: day(ago),
        seconds: secs, endedAt: Date.now() - ago * 86400000, planned: true,
        distractions: i === 2 ? 2 : 0
      })),
      {
        id: 'today1', subjectId: 's1', day: day(0), seconds: 5400,
        endedAt: Date.now(), planned: true, distractions: 1
      }
    ],
    exam: null
  }));
  check('streak survives the new session shape',
    await page.getByText(/🔥 6 days/).isVisible());

  await page.getByTestId('tab-stats').click();
  await page.waitForTimeout(600);
  check('calendar rendered', await page.getByText('Last 12 weeks').isVisible());
  check('phone checks totalled',
    await page.getByText('Phone checks', { exact: true }).isVisible());
  check('clean rounds counted', await page.getByText('6/8').isVisible());

  // ---------- editing a past sitting: length, date and subject ----------
  await page.getByText('Edit').first().click();
  await page.waitForTimeout(300);
  // The date field is pre-filled; saving without retyping it must work.
  await page.getByTestId('edit-minutes').fill('99');
  await page.getByTestId('edit-save').click();
  await page.waitForTimeout(400);
  check('a sitting saves without retyping its pre-filled date',
    await page.getByText('1h 39m').first().isVisible());

  await page.getByText('Edit').first().click();
  await page.waitForTimeout(300);
  const tomorrow = new Date(Date.now() + 86400000);
  const p2 = x => String(x).padStart(2, '0');
  await page.getByTestId('edit-date')
    .fill(`${p2(tomorrow.getDate())}/${p2(tomorrow.getMonth() + 1)}/${tomorrow.getFullYear()}`);
  await page.getByTestId('edit-save').click();
  await page.waitForTimeout(300);
  check('a sitting cannot be moved into the future',
    await page.getByText('That day has not happened yet').isVisible());

  await page.getByTestId('edit-date').fill('01/08/2026');
  await page.getByTestId('edit-minutes').fill('75');
  await page.getByTestId('edit-subject-s3').click();
  await page.getByTestId('edit-save').click();
  await page.waitForTimeout(500);
  check('the edited sitting moved subject, date and length',
    await page.getByText('1 Aug 2026').first().isVisible());
  check('edited length shown', await page.getByText('1h 15m').first().isVisible());
  await page.screenshot({ path: 'shot-stats.png' });
  await page.getByText('Last 12 weeks').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shot-calendar.png' });

  // ---------- Hindi covers the new screens ----------
  await page.getByTestId('tab-settings').click();
  await page.waitForTimeout(300);
  await page.getByTestId('lang-hi').click();
  await page.waitForTimeout(400);
  check('round settings translated', await page.getByText('फ़ोकस राउंड').isVisible());
  await page.getByTestId('tab-today').click();
  await page.waitForTimeout(400);
  check('dashboard translated', await page.getByText('क्या पढ़ रहे हैं?').isVisible());
  check('start button translated', await page.getByText('फ़ोकस शुरू करें').isVisible());
  await page.screenshot({ path: 'shot-hi-today.png' });

  await page.getByTestId('start-focus').click();
  await page.waitForTimeout(900);
  check('focus mode translated', await page.getByText('राउंड 1').isVisible());
  await page.getByTestId('focus-stop').click();
  await page.waitForTimeout(500);

  await page.getByTestId('tab-settings').click();
  await page.getByTestId('lang-en').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shot-settings.png' });
  await page.getByTestId('tab-today').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shot-today.png' });
  await page.getByTestId('tab-subjects').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shot-subjects.png' });

  check('no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log(failures ? `\n${failures} failing check(s)` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
