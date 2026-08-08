/* One subject on its own screen.

   The numbers have unit tests; what this covers is the wiring and the one
   thing that has to be right for the screen to be worth having — that "last
   studied N days ago" counts real days, including gaps older than the chart's
   own window. */

const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:8081';
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  → ' + extra}`);
  if (!ok) failures++;
};

const day = n => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const p = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/* Physics studied today, Chemistry nine days ago, Maths sixty days ago —
   outside the 30-day chart, which is exactly the case a naive index lookup
   gets wrong. Biology never. */
const seed = (extra = {}) => ({
  v: 1,
  subjects: [
    { id: 's1', name: 'Physics', color: '#5B78E0' },
    { id: 's2', name: 'Chemistry', color: '#1F8F84' },
    { id: 's3', name: 'Maths', color: '#D2553A' },
    { id: 's4', name: 'Biology', color: '#B07500' }
  ],
  sessions: [
    { id: 'a', subjectId: 's1', day: day(0), seconds: 5400, endedAt: 5, planned: true },
    { id: 'b', subjectId: 's1', day: day(2), seconds: 3600, endedAt: 4, planned: true },
    { id: 'c', subjectId: 's2', day: day(9), seconds: 7200, endedAt: 3, planned: true },
    { id: 'd', subjectId: 's3', day: day(60), seconds: 1800, endedAt: 2, manual: true }
  ],
  dailyTargetMinutes: 240,
  exam: null, active: null, lang: 'en',
  reminder: { enabled: false, hour: 21, minute: 0 },
  pomodoro: { preset: 'standard', focusMinutes: 25, breakMinutes: 5 },
  themePref: 'light', celebratedDay: day(0), onboarded: true,
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
    await page.waitForTimeout(1400);
  };
  const since = () => page.getByTestId('subject-since').textContent();
  const openSubject = async (id) => {
    await page.getByTestId(`open-${id}`).click();
    await page.waitForTimeout(600);
  };
  const back = async () => {
    await page.getByTestId('subject-back').click();
    await page.waitForTimeout(500);
  };

  console.log('bundling…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="ob-title"], [data-testid="tab-today"]')
    .first().waitFor({ timeout: 180000 });

  await load(seed());
  await page.getByTestId('tab-subjects').click();
  await page.waitForTimeout(700);

  // ---- the list carries the gap, which is the number that changes behaviour ----
  const listText = await page.evaluate(() =>
    document.body.innerText.replace(/\s+/g, ' '));
  check('the list says how long each subject has been left alone',
    listText.includes('Studied today')
    && listText.includes('Last studied 9 days ago')
    && listText.includes('Not started yet'),
    listText.slice(0, 300));

  // ---- opening one ----
  await openSubject('s2');
  check('a subject opens on its own screen',
    (await page.getByTestId('subject-name').textContent()) === 'Chemistry');
  check('and leads with how long it has been neglected',
    (await since()) === 'Last studied 9 days ago', await since());
  check('with its own all-time total, not everyone\'s',
    (await page.getByTestId('subject-all').textContent()) === '2h',
    await page.getByTestId('subject-all').textContent());
  await page.screenshot({ path: 'shot-subject.png' });

  // ---- a gap older than the chart still counts correctly ----
  await back();
  await openSubject('s3');
  check('a gap older than the 30-day chart is still counted in real days',
    (await since()) === 'Last studied 60 days ago', await since());
  check('and its total is still right',
    (await page.getByTestId('subject-all').textContent()) === '30m',
    await page.getByTestId('subject-all').textContent());

  // ---- today, and never ----
  await back();
  await openSubject('s1');
  check('a subject studied today says so', (await since()) === 'Studied today');
  check('its total adds up its own sittings only',
    (await page.getByTestId('subject-all').textContent()) === '2h 30m',
    await page.getByTestId('subject-all').textContent());

  await back();
  await openSubject('s4');
  check('one never studied says that instead of a gap',
    (await since()) === 'Not started yet');
  check('and its sittings list explains itself rather than sitting blank',
    await page.getByText('Nothing recorded for this subject yet.').isVisible());

  // ---- back goes back ----
  await back();
  check('back returns to the list',
    await page.getByTestId('add-subject').isVisible());

  // ---- deleting the open subject does not strand the screen ----
  await openSubject('s2');
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('padhai-streak:v1'));
    raw.subjects = raw.subjects.filter(s => s.id !== 's2');
    localStorage.setItem('padhai-streak:v1', JSON.stringify(raw));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  await page.getByTestId('tab-subjects').click();
  await page.waitForTimeout(600);
  check('a deleted subject leaves the list, not a ghost screen',
    await page.getByTestId('add-subject').isVisible());

  // ---- yesterday reads as yesterday, not "1 days ago" ----
  await load(seed({
    sessions: [{ id: 'y', subjectId: 's1', day: day(1), seconds: 3600, endedAt: 1 }]
  }));
  await page.getByTestId('tab-subjects').click();
  await page.waitForTimeout(600);
  await openSubject('s1');
  check('one day ago reads as yesterday', (await since()) === 'Last studied yesterday',
    await since());

  // ---- Hindi ----
  await load(seed({ lang: 'hi' }));
  await page.getByTestId('tab-subjects').click();
  await page.waitForTimeout(600);
  await openSubject('s2');
  check('the screen is translated', (await since()) === 'पिछली बार 9 दिन पहले पढ़ा',
    await since());
  check('so is the way back', await page.getByText('‹ सभी विषय').isVisible());

  check('no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log(failures ? `\n${failures} failing check(s)` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
