/* Backup and restore, driven through the UI. The file transport is native-only,
   but the paste path is the fallback everywhere and exercises the same
   parse-confirm-replace flow. */
const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:8081';
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  → ' + extra}`);
  if (!ok) failures++;
};

const seeded = {
  v: 1,
  subjects: [{ id: 's1', name: 'Physics', color: '#3552CC' }],
  sessions: [
    { id: 'a', subjectId: 's1', day: '2026-08-01', seconds: 5400, endedAt: 10 },
    { id: 'b', subjectId: 's1', day: '2026-08-02', seconds: 3600, endedAt: 20 }
  ],
  dailyTargetMinutes: 240, exam: null, active: null, lang: 'en',
  reminder: { enabled: false, hour: 21, minute: 0 },
  pomodoro: { preset: 'standard', focusMinutes: 25, breakMinutes: 5 }
};

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('bundling…');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByText('Today', { exact: true }).first().waitFor({ timeout: 180000 });
  await page.evaluate(s => localStorage.setItem('padhai-streak:v1', JSON.stringify(s)), seeded);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // ---- save produces a real file ----
  await page.getByTestId('tab-settings').click();
  await page.waitForTimeout(600);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByTestId('backup-save').click()
  ]);
  check('saving offers a dated file', /^padhai-streak-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()),
    download.suggestedFilename());

  const fs = require('fs');
  const path = await download.path();
  const text = fs.readFileSync(path, 'utf8');
  const parsed = JSON.parse(text);
  check('the file is one of ours', parsed.kind === 'padhai-streak-backup');
  check('the file carries the history', parsed.state.sessions.length === 2);
  check('the file carries no running timer', parsed.state.active === null);

  // ---- wipe, then restore from that text ----
  await page.evaluate(() => localStorage.removeItem('padhai-streak:v1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.getByTestId('tab-stats').click();
  await page.waitForTimeout(500);
  check('the app really is empty before restoring',
    await page.getByText('Nothing to show yet').isVisible());

  await page.getByTestId('tab-settings').click();
  await page.getByTestId('backup-restore').click();
  await page.waitForTimeout(400);

  await page.getByTestId('restore-paste').fill('this is not a backup');
  await page.waitForTimeout(400);
  check('junk text is refused with an explanation',
    await page.getByText(/not readable/).isVisible());

  await page.getByTestId('restore-paste').fill(JSON.stringify({ kind: 'other-app', state: {} }));
  await page.waitForTimeout(400);
  check('another app\'s file is refused',
    await page.getByText('That is not a Padhai Streak backup.').isVisible());

  await page.getByTestId('restore-paste').fill(text);
  await page.waitForTimeout(500);
  check('a good backup reports what it holds before overwriting',
    await page.getByText(/holds 2 sittings/).isVisible());

  await page.getByTestId('restore-do').click();
  await page.waitForTimeout(800);
  check('restoring reports what came back',
    await page.getByText('Restored 2 sittings').isVisible());

  await page.getByTestId('tab-stats').click();
  await page.waitForTimeout(600);
  check('the history is actually back', await page.getByText('Recent sittings').isVisible());

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.getByTestId('tab-stats').click();
  await page.waitForTimeout(600);
  check('the restore survives a reload', await page.getByText('Recent sittings').isVisible());

  check('no runtime errors', errors.length === 0, errors.slice(0, 2).join(' | '));

  await browser.close();
  console.log(failures ? `\n${failures} failing check(s)` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
