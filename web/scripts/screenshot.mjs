/**
 * screenshot.mjs
 * Takes 4 screenshots of the running dev/prod server and saves them
 * to docs/screenshots/ relative to the repo root.
 *
 * Usage (from /web):
 *   node scripts/screenshot.mjs [base_url]
 *   default base_url: http://localhost:3000
 *
 * Pages captured:
 *   01-home.png        /id
 *   02-translate.png   /id/translate
 *   03-dictionary.png  /id/dictionary
 *   04-conversation.png /id/conversation
 */

import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const OUT_DIR = resolve(REPO_ROOT, 'docs', 'screenshots');

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';

/** Pages to capture: [filename, path, waitSelector or null] */
const PAGES = [
  {
    file: '01-home.png',
    path: '/id',
    // Wait for the canvas / Three.js hero to appear
    waitFor: 'canvas',
    delayMs: 3000,
  },
  {
    file: '02-translate.png',
    path: '/id/translate',
    // Wait for the camera stage UI wrapper
    waitFor: 'main',
    delayMs: 2000,
  },
  {
    file: '03-dictionary.png',
    path: '/id/dictionary',
    waitFor: 'main',
    delayMs: 2500,
  },
  {
    file: '04-conversation.png',
    path: '/id/conversation',
    waitFor: 'main',
    delayMs: 2000,
  },
];

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`📸  Screenshots → ${OUT_DIR}`);
  console.log(`🌐  Base URL   : ${BASE_URL}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // Allow camera/mic permissions (they won't actually activate in headless)
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  try {
    for (const { file, path, waitFor, delayMs } of PAGES) {
      const url = `${BASE_URL}${path}`;
      const outPath = resolve(OUT_DIR, file);

      console.log(`  → ${url}`);
      const page = await browser.newPage();

      await page.setViewport(VIEWPORT);

      // Grant camera/microphone to avoid permission prompts blocking the UI
      const context = browser.defaultBrowserContext();
      await context.overridePermissions(BASE_URL, ['camera', 'microphone']);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });

      if (waitFor) {
        try {
          await page.waitForSelector(waitFor, { timeout: 10_000 });
        } catch {
          // selector may not exist on this page, continue anyway
        }
      }

      // Extra settle time for animations / Three.js canvas
      await new Promise((r) => setTimeout(r, delayMs));

      await page.screenshot({ path: outPath, type: 'png', fullPage: false });
      console.log(`     ✓ saved ${file}`);

      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log('\n✅  All screenshots saved.');
  console.log(`\nNext steps:`);
  console.log(`  git add docs/screenshots/`);
  console.log(`  git commit -m "docs: add app preview screenshots"`);
  console.log(`  git push`);
}

main().catch((err) => {
  console.error('Screenshot failed:', err);
  process.exit(1);
});

