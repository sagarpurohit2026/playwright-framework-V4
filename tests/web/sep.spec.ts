/**
 * SEP work-request history scraper (Playwright + TypeScript)
 *
 * For each Work Request ID it searches in SearchTask.asp, opens the detail popup
 * and reads the "Work request history" table (Date / User / WR.Type / Remarks /
 * WR.Status / Mail to client / Bad fix ID).
 *
 * Credentials are read from env vars - never hard-code them:
 *   SEP_USER, SEP_PASS
 *
 * Optional env vars (use if the default selectors don't match the page):
 *   HEADED=1                 show the browser (recommended for the first run)
 *   SEP_ID_SELECTOR          CSS selector of the Work Request ID textbox
 *   SEP_SEARCH_SELECTOR      CSS selector of the search button/icon (default: press Enter)
 *   SEP_VIEW_ICON_INDEX      which icon in the Options column opens the popup (0-based, default 1)
 *
 * Usage:
 *   npx tsx sep-wr-history.ts                       # uses DEFAULT_IDS below
 *   npx tsx sep-wr-history.ts ASM7_EOO_00032 ...    # specific IDs
 */
import { chromium, Frame, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SEARCH_URL = 'http://sep.abatech-services.com/content/Transactions/SearchTask.asp';
const USER = process.env.SEP_USER ?? 'sagarpurohit.s@abatech-services.com';
const PASS = process.env.SEP_PASS ?? 'sep';
const HEADED = process.env.HEADED === '1';
const ID_SELECTOR = process.env.SEP_ID_SELECTOR;
const SEARCH_SELECTOR = process.env.SEP_SEARCH_SELECTOR;
const VIEW_ICON_INDEX = Number(process.env.SEP_VIEW_ICON_INDEX ?? '1');

// IDs from Recurring_Issue_Analysis_EO_Delta.xlsx
const DEFAULT_IDS = [
  'ASM7_EOO_00032', 'ASM7_EOO_00048', 'ASM7_EOO_00056', 'ASM7_EOO_00075',
  'ASM7_EOO_00076', 'ASM7_EOO_00080', 'ASM7_EOO_00081',
  'ASM7_EOO_00045', 'ASM7_EOO_00046', 'ASM7_EOO_00062', 'ASM7_EOO_00064',
  'ASM7_EOO_00068', 'ASM7_EOO_00073', 'ASM7_EOO_00071',
  'ASM7_EOO_00038', 'ASM7_EOO_00041',
  'ASM7_EOO_00043', 'ASM7_EOO_00055', 'ASM7_EOO_00067', 'ASM7_EOO_00069',
  'ASM7_NOAH_01957', 'ASM7_NOAH_01958', 'ASM7_NOAH_01959',
];

interface HistoryRow {
  date: string;
  user: string;
  type: string;
  remarks: string;
  status: string;
  mailToClient: string;
  badFixId: string;
}

interface Result {
  id: string;
  found: boolean;
  currentStatus: string;
  posted: string;
  description: string;
  latestEntry: string;
  latestNonEmptyRemark: string;
  history: HistoryRow[];
  error?: string;
}

function parseSepDate(s: string): number {
  // "11/20/2025 10:24:09 IST" -> timestamp (mm/dd/yyyy)
  const m = s.replace(/\s*IST\s*$/i, '').match(/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+):(\d+)/);
  if (!m) return 0;
  const [, mo, d, y, h, mi, se] = m.map(Number);
  return new Date(y, mo - 1, d, h, mi, se).getTime();
}

async function loginIfNeeded(page: Page): Promise<void> {
  const pw = page.locator('input[type="password"]').first();
  if ((await pw.count()) === 0) return;
  if (!USER || !PASS) throw new Error('Login page shown but SEP_USER / SEP_PASS are not set.');
  const user = page.locator('input[type="text"], input:not([type])').first();
  await user.fill(USER);
  await pw.fill(PASS);
  await Promise.all([
    page.waitForLoadState('domcontentloaded').catch(() => undefined),
    pw.press('Enter'),
  ]);
  await page.waitForTimeout(1500);
}

async function waitForHistoryFrame(page: Page, timeoutMs = 20000): Promise<Frame | null> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    for (const p of page.context().pages()) {
      for (const f of p.frames()) {
        try {
          if ((await f.locator('text=Work request history').count()) > 0) return f;
        } catch {
          /* frame may be navigating */
        }
      }
    }
    await page.waitForTimeout(300);
  }
  return null;
}

async function closePopup(page: Page, frame: Frame): Promise<void> {
  const popupPage = frame.page();
  if (popupPage !== page) {
    await popupPage.close().catch(() => undefined);
    return;
  }
  const closeBtn = frame.locator('input[value="Close"], button:has-text("Close")').first();
  if ((await closeBtn.count()) > 0) await closeBtn.click().catch(() => undefined);
}

async function extract(frame: Frame) {
  return frame.evaluate(() => {
    const txt = (e: Element | null | undefined) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const cells = Array.from(document.querySelectorAll('td'));
    const kv = (label: string) => {
      const c = cells.find((td) => txt(td).toLowerCase() === label.toLowerCase());
      return c ? txt(c.nextElementSibling) : '';
    };
    const tables = Array.from(document.querySelectorAll('table'));
    const hist = tables.find((t) => {
      const h = txt(t).toLowerCase();
      return h.includes('remarks') && h.includes('wr.status') && !t.querySelector('table');
    });
    const rows: string[][] = [];
    if (hist) {
      for (const tr of Array.from(hist.querySelectorAll('tr'))) {
        const tds = Array.from(tr.querySelectorAll('td, th')).map((c) => txt(c));
        if (tds.length >= 6 && tds[0].toLowerCase() !== 'date') rows.push(tds);
      }
    }
    return {
      status: kv('WR status'),
      posted: kv('Posted'),
      description: kv('Description'),
      rows,
    };
  });
}

async function fetchOne(page: Page, id: string): Promise<Result> {
  const empty: Result = {
    id, found: false, currentStatus: '', posted: '', description: '',
    latestEntry: '', latestNonEmptyRemark: '', history: [],
  };
  try {
    await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded' });
    await loginIfNeeded(page);
    if (!page.url().toLowerCase().includes('searchtask.asp')) {
      await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded' });
    }

    // Locate the Work Request ID textbox
    if (!ID_SELECTOR) {
      await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('input[type="text"]')).find((i) =>
          /^ASM/i.test((i as HTMLInputElement).value),
        );
        el?.setAttribute('data-wr-field', '1');
      });
    }
    const field = ID_SELECTOR ? page.locator(ID_SELECTOR).first() : page.locator('[data-wr-field="1"]').first();
    if ((await field.count()) === 0) {
      throw new Error('Work request ID textbox not found - set SEP_ID_SELECTOR.');
    }
    await field.fill(id);
    if (SEARCH_SELECTOR) await page.locator(SEARCH_SELECTOR).first().click();
    else await field.press('Enter');

    // Result row = innermost <tr> containing the ID
    const row = page.locator('tr:not(:has(tr))', { hasText: id }).first();
    try {
      await row.waitFor({ state: 'visible', timeout: 15000 });
    } catch {
      return { ...empty, error: 'No result row found' };
    }

    const icons = row.locator('td').last().locator('a, img, input[type="image"]');
    if ((await icons.count()) <= VIEW_ICON_INDEX) {
      return { ...empty, found: true, error: 'View icon not found in Options column - set SEP_VIEW_ICON_INDEX.' };
    }
    await icons.nth(VIEW_ICON_INDEX).click();

    const frame = await waitForHistoryFrame(page);
    if (!frame) return { ...empty, found: true, error: 'History popup did not open' };

    const data = await extract(frame);
    const history: HistoryRow[] = data.rows
      .map((r) => ({
        date: r[0], user: r[1], type: r[2], remarks: r[3],
        status: r[4], mailToClient: r[5] ?? '', badFixId: r[6] ?? '',
      }))
      .sort((a, b) => parseSepDate(b.date) - parseSepDate(a.date));

    await closePopup(page, frame);

    const latest = history[0];
    const latestRemark = history.find((h) => h.remarks.trim() !== '');
    return {
      id,
      found: true,
      currentStatus: data.status,
      posted: data.posted,
      description: data.description,
      latestEntry: latest ? `${latest.date} | ${latest.user} | ${latest.remarks || '-'} | ${latest.status}` : '',
      latestNonEmptyRemark: latestRemark
        ? `${latestRemark.date} | ${latestRemark.user} | ${latestRemark.remarks}`
        : '',
      history,
    };
  } catch (e) {
    return { ...empty, error: (e as Error).message };
  }
}

function csvEscape(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

async function main() {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_IDS;
  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept().catch(() => undefined));

  const results: Result[] = [];
  for (const id of ids) {
    process.stdout.write(`Checking ${id} ... `);
    const r = await fetchOne(page, id);
    console.log(r.error ? `ERROR: ${r.error}` : `${r.currentStatus} | ${r.latestEntry}`);
    results.push(r);
  }
  await browser.close();

  const outDir = path.resolve('out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'wr-history.json'), JSON.stringify(results, null, 2));

  const header = ['Work Request ID', 'Found', 'Current WR Status', 'Posted', 'Latest entry', 'Latest non-empty remark', 'Full history', 'Error'];
  const lines = results.map((r) =>
    [
      r.id, String(r.found), r.currentStatus, r.posted, r.latestEntry, r.latestNonEmptyRemark,
      r.history.map((h) => `${h.date} ${h.user}: ${h.remarks || '-'} [${h.status}]`).join(' || '),
      r.error ?? '',
    ].map(csvEscape).join(','),
  );
  fs.writeFileSync(path.join(outDir, 'wr-history.csv'), [header.map(csvEscape).join(','), ...lines].join('\n'));
  console.log(`\nSaved ${results.length} results to ${outDir}/wr-history.csv and .json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});