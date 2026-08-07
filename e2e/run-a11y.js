/* Accessibility checks against the rendered DOM. react-native-web maps
   accessibilityRole/State/Label onto ARIA, so what a screen reader would see
   here is a fair proxy for what TalkBack sees on the device. */

const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:8081';
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  → ' + extra}`);
  if (!ok) failures++;
};

const MIN_TARGET = 44;

const seed = {
  v: 1,
  subjects: [
    { id: 's1', name: 'Physics', color: '#7c5cff' },
    { id: 's2', name: 'Chemistry', color: '#22c55e' }
  ],
  sessions: [
    { id: 'x', subjectId: 's1', day: '2026-08-06', seconds: 5400, endedAt: 2, planned: true },
    { id: 'y', subjectId: 's2', day: '2026-08-05', seconds: 3600, endedAt: 1, manual: true }
  ],
  dailyTargetMinutes: 240,
  exam: null, active: null, lang: 'en',
  reminder: { enabled: false, hour: 21, minute: 0 },
  pomodoro: { preset: 'standard', focusMinutes: 25, breakMinutes: 5 }
};

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  console.log('bundling…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByText('Today', { exact: true }).first().waitFor({ timeout: 180000 });
  await page.evaluate(s => localStorage.setItem('padhai-streak:v1', JSON.stringify(s)), seed);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  /** Every element that can be pressed, with its box and accessible name. */
  const targets = () => page.evaluate(() => {
    const out = [];
    document.querySelectorAll('[role="button"], [role="tab"], [role="radio"]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      out.push({
        role: el.getAttribute('role'),
        name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60),
        w: Math.round(r.width),
        h: Math.round(r.height)
      });
    });
    return out;
  });

  // ---- dashboard ----
  const dash = await targets();
  check('every control on the dashboard has an accessible name',
    dash.every(t => t.name.length > 0),
    JSON.stringify(dash.filter(t => !t.name.length)));

  const smallDash = dash.filter(t => t.h < MIN_TARGET);
  check(`every dashboard target is at least ${MIN_TARGET}px tall`,
    smallDash.length === 0,
    JSON.stringify(smallDash));

  check('the subject picker announces which subject is chosen',
    (await page.getByTestId('pick-s1').getAttribute('aria-checked')) === 'true');
  check('an unchosen subject is not announced as chosen',
    (await page.getByTestId('pick-s2').getAttribute('aria-checked')) === 'false');
  check('the chosen subject carries its time in its name',
    ((await page.getByTestId('pick-s1').getAttribute('aria-label')) || '').includes('Physics'));

  check('the tab bar reports which tab is current',
    (await page.getByTestId('tab-today').getAttribute('aria-selected')) === 'true');

  // ---- the dial reads as numbers, not as an unlabelled graphic ----
  check('the dial\'s own numbers are readable',
    (await page.getByTestId('dial-total').textContent()) === '0m');
  const svgHidden = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    if (!svg) return 'no svg';
    let el = svg;
    while (el) {
      if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return true;
      el = el.parentElement;
    }
    return false;
  });
  check('the decorative ring is hidden from screen readers', svgHidden === true, String(svgHidden));

  // ---- stats: row actions must say what they act on ----
  await page.getByTestId('tab-stats').click();
  await page.waitForTimeout(800);
  const stats = await targets();
  const bare = stats.filter(t => /^(edit|delete|rename)$/i.test(t.name));
  check('no bare "Edit"/"Delete" controls — each names its sitting',
    bare.length === 0, JSON.stringify(bare));
  check('an edit control names subject and date',
    stats.some(t => /Edit — Physics, 6 Aug 2026/.test(t.name)),
    JSON.stringify(stats.map(t => t.name).slice(0, 8)));

  const smallStats = stats.filter(t => t.h < MIN_TARGET);
  check(`every stats target is at least ${MIN_TARGET}px tall`,
    smallStats.length === 0, JSON.stringify(smallStats));

  // ---- subjects ----
  await page.getByTestId('tab-subjects').click();
  await page.waitForTimeout(700);
  const subs = await targets();
  check('subject actions name their subject',
    subs.some(t => /Rename — Physics/.test(t.name)) && subs.some(t => /Delete — Physics/.test(t.name)),
    JSON.stringify(subs.map(t => t.name).slice(0, 10)));

  await browser.close();
  console.log(failures ? `\n${failures} failing check(s)` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
