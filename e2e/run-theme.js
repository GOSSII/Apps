/* Dark mode, driven through the real app rather than asserted about the token
   file. The palette has unit tests; what this covers is the wiring — that the
   preference reaches every screen, survives a reload, follows the OS when it
   is set to, and that an old subject's colour is migrated on the way in.

   Colours come back from getComputedStyle as 'rgb(r, g, b)', so the checks
   below compare against that form rather than the hex in theme.tsx. */

const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:8081';
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  → ' + extra}`);
  if (!ok) failures++;
};

const LIGHT_BG = 'rgb(245, 244, 240)';   // #F5F4F0
const DARK_BG = 'rgb(17, 19, 16)';       // #111310
const DARK_SURFACE = 'rgb(26, 28, 25)';  // #1A1C19

const seed = (extra = {}) => ({
  v: 1,
  subjects: [
    // The colour a subject created before dark mode would be carrying.
    { id: 's1', name: 'Physics', color: '#3552CC' },
    { id: 's2', name: 'Chemistry', color: '#12897E' }
  ],
  sessions: [
    { id: 'x', subjectId: 's1', day: '2026-08-06', seconds: 5400, endedAt: 2, planned: true }
  ],
  dailyTargetMinutes: 240,
  exam: null, active: null, lang: 'en',
  reminder: { enabled: false, hour: 21, minute: 0 },
  pomodoro: { preset: 'standard', focusMinutes: 25, breakMinutes: 5 },
  ...extra
});

/** The page's own ground, as painted. */
const groundOf = page => page.evaluate(() => {
  const el = document.querySelector('[data-testid="tab-today"]');
  // Walk out to the screen container and read what is actually behind it.
  let node = el;
  while (node) {
    const bg = getComputedStyle(node).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      if (node.getBoundingClientRect().height > 400) return bg;
    }
    node = node.parentElement;
  }
  return 'none';
});

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });

  const open = async (colorScheme) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    /* A blank profile is a first run now, so wait for whichever of the two
       the app legitimately opens on. */
    await page.locator('[data-testid="ob-title"], [data-testid="tab-today"]')
      .first().waitFor({ timeout: 180000 });
    return { ctx, page, errors };
  };

  const load = async (page, state) => {
    await page.evaluate(s => localStorage.setItem('padhai-streak:v1', JSON.stringify(s)), state);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1400);
  };

  console.log('bundling…');
  let { ctx, page, errors } = await open('light');

  // ---- the default follows the phone ----
  await load(page, seed());
  check('with the phone on light, the app is light', (await groundOf(page)) === LIGHT_BG,
    await groundOf(page));

  // ---- choosing dark overrides it ----
  await page.getByTestId('tab-settings').click();
  await page.waitForTimeout(500);
  check('settings offers the three choices',
    (await page.getByTestId('theme-system').isVisible())
    && (await page.getByTestId('theme-light').isVisible())
    && (await page.getByTestId('theme-dark').isVisible()));

  await page.getByTestId('theme-dark').click();
  await page.waitForTimeout(600);
  const darkNow = await groundOf(page);
  check('choosing dark repaints the app immediately', darkNow === DARK_BG, darkNow);

  // Cards have to stay distinguishable from the ground, or the whole screen
  // reads as one flat sheet.
  const cardBg = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find(d => {
      const s = getComputedStyle(d);
      return s.borderRadius.startsWith('22px') && s.backgroundColor !== 'rgba(0, 0, 0, 0)';
    });
    return el ? getComputedStyle(el).backgroundColor : 'none';
  });
  check('a card is lighter than the ground it sits on', cardBg === DARK_SURFACE, cardBg);

  // ---- it survives a reload ----
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  check('the choice is remembered across a restart', (await groundOf(page)) === DARK_BG);

  // ---- every screen honours it, including full-screen focus mode ----
  for (const tab of ['stats', 'subjects', 'today']) {
    await page.getByTestId(`tab-${tab}`).click();
    await page.waitForTimeout(500);
    check(`${tab} is dark too`, (await groundOf(page)) === DARK_BG, await groundOf(page));
  }

  await page.getByTestId('start-focus').click();
  await page.waitForTimeout(900);
  const focusBg = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')]
      .find(d => d.getBoundingClientRect().height > 700
        && getComputedStyle(d).backgroundColor !== 'rgba(0, 0, 0, 0)');
    return el ? getComputedStyle(el).backgroundColor : 'none';
  });
  check('focus mode is dark — the one screen that is on at 1am', focusBg === DARK_BG, focusBg);
  await page.getByTestId('focus-stop').click();
  await page.waitForTimeout(600);

  // ---- an old subject's colour is brought forward, not left invisible ----
  const dotColours = await page.evaluate(() =>
    [...document.querySelectorAll('div')]
      .filter(d => {
        /* Any small circle: subject dots are drawn at 8, 9 or 12px depending
           on which screen they are on, so pinning one size finds nothing. */
        const s = getComputedStyle(d);
        const w = parseFloat(s.width);
        return w >= 8 && w <= 12 && s.width === s.height
          && Math.abs(parseFloat(s.borderRadius) - w / 2) < 0.6;
      })
      .map(d => getComputedStyle(d).backgroundColor));
  check('the pre-dark-mode subject colour was migrated on load',
    !dotColours.includes('rgb(53, 82, 204)'), JSON.stringify(dotColours));

  // ---- switching back is just as immediate ----
  await page.getByTestId('tab-settings').click();
  await page.waitForTimeout(400);
  await page.getByTestId('theme-light').click();
  await page.waitForTimeout(600);
  check('choosing light comes back', (await groundOf(page)) === LIGHT_BG);

  check('no runtime errors while switching', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();

  // ---- 'system' really does follow the phone ----
  ({ ctx, page, errors } = await open('dark'));
  await load(page, seed({ themePref: 'system' }));
  check('on a dark phone, System means dark', (await groundOf(page)) === DARK_BG,
    await groundOf(page));

  await page.getByTestId('tab-settings').click();
  await page.waitForTimeout(400);
  await page.getByTestId('theme-light').click();
  await page.waitForTimeout(600);
  check('but an explicit Light still wins over a dark phone',
    (await groundOf(page)) === LIGHT_BG, await groundOf(page));
  check('no runtime errors following the system', errors.length === 0, errors.slice(0, 2).join(' | '));

  await browser.close();
  console.log(failures ? `\n${failures} failing check(s)` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
