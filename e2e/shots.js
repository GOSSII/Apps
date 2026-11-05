/* Renders every screen, in both themes, into e2e/shots/.
   Not a test — a way to look at the thing, which has caught more on this
   project than any assertion has. */

const { chromium } = require('playwright-core');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8081';
const OUT = __dirname + '/shots';

const day = n => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const p = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const H = 3600;
const seed = (extra = {}) => ({
  v: 1,
  subjects: [
    { id: 's1', name: 'Physics', color: '#5A78DA' },
    { id: 's2', name: 'Chemistry', color: '#2B8A7E' },
    { id: 's3', name: 'Maths', color: '#C4553C' },
    { id: 's4', name: 'Current Affairs', color: '#A8781F' }
  ],
  sessions: [
    { id: 'a', subjectId: 's1', day: day(0), seconds: 2.5 * H, endedAt: 90, planned: true, distractions: 1 },
    { id: 'b', subjectId: 's2', day: day(0), seconds: 1 * H, endedAt: 80, planned: true },
    { id: 'c', subjectId: 's3', day: day(1), seconds: 4.5 * H, endedAt: 70, planned: true },
    { id: 'd', subjectId: 's1', day: day(2), seconds: 4 * H, endedAt: 60, planned: true },
    { id: 'e', subjectId: 's2', day: day(3), seconds: 3 * H, endedAt: 50, manual: true },
    { id: 'f', subjectId: 's1', day: day(4), seconds: 4.25 * H, endedAt: 40, planned: true },
    { id: 'g', subjectId: 's3', day: day(5), seconds: 2 * H, endedAt: 30, planned: true, distractions: 3 },
    { id: 'h', subjectId: 's1', day: day(6), seconds: 5 * H, endedAt: 20, planned: true },
    { id: 'i', subjectId: 's2', day: day(12), seconds: 3 * H, endedAt: 10, planned: true },
    { id: 'j', subjectId: 's1', day: day(20), seconds: 4 * H, endedAt: 5, planned: true }
  ],
  dailyTargetMinutes: 240,
  exam: { name: 'NEET 2027', date: '2027-05-03' },
  active: null,
  lang: 'en',
  reminder: { enabled: true, hour: 21, minute: 0 },
  nudges: { neglect: true, streakRisk: true },
  pomodoro: { preset: 'standard', focusMinutes: 25, breakMinutes: 5 },
  themePref: 'light',
  celebratedDay: day(0),
  onboarded: true,
  ...extra
});

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await ctx.newPage();

  const load = async (state) => {
    await page.evaluate(s => localStorage.setItem('padhai-streak:v1', JSON.stringify(s)), state);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
  };
  /* react-native-web gives the ScrollView its own scroll container, so
     window.scrollTo does nothing at all — it has to be a real wheel event
     over the content. */
  const scrollTo = async (y) => {
    await page.mouse.move(195, 400);
    await page.mouse.wheel(0, -6000);
    await page.waitForTimeout(200);
    if (y > 0) { await page.mouse.wheel(0, y); await page.waitForTimeout(400); }
  };
  const shot = async (name) => {
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log(name);
  };

  console.log('bundling…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="ob-title"], [data-testid="tab-today"]')
    .first().waitFor({ timeout: 180000 });

  // ---- onboarding, from a genuinely blank profile ----
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await shot('01-onboarding');
  await page.getByTestId('ob-next').click();
  await shot('02-onboarding-exam');

  for (const theme of ['light', 'dark']) {
    const tag = theme === 'light' ? '' : '-dark';
    await load(seed({ themePref: theme }));
    await shot(`10-today${tag}`);

    await page.getByTestId('tab-stats').click();
    await shot(`11-stats${tag}`);
    await scrollTo(900);
    await shot(`12-stats-mid${tag}`);
    await scrollTo(2100);
    await shot(`13-stats-low${tag}`);

    await page.getByTestId('tab-subjects').click();
    await scrollTo(0);
    await shot(`14-subjects${tag}`);
    await page.getByTestId('open-s2').click();
    await shot(`15-subject-detail${tag}`);
    await page.getByTestId('subject-back').click();

    await page.getByTestId('tab-settings').click();
    await scrollTo(0);
    await shot(`16-settings${tag}`);
    await scrollTo(900);
    await shot(`17-settings-low${tag}`);

    await page.getByTestId('tab-today').click();
    await scrollTo(0);
    await page.getByTestId('start-focus').click();
    await shot(`18-focus${tag}`);
    await page.getByTestId('focus-discard').click();
    await page.waitForTimeout(500);
  }

  // ---- the celebration ----
  await load(seed({ themePref: 'light', celebratedDay: null }));
  /* The seed day is deliberately short of the target everywhere else, so the
     celebration only appears once the app itself crosses it. */
  await page.getByTestId('log-manually').click();
  await page.waitForTimeout(300);
  await page.getByTestId('manual-minutes').fill('45');
  await page.getByTestId('manual-add').click();
  await page.waitForTimeout(900);
  await shot('19-celebration');

  await browser.close();
})();
