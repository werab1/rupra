// Smoke test: synchronizace zápis → panel → overlay, refresh, čas, UNDO, poločasy, karty + screenshoty grafik.
// Spuštění: npm run dev (v jiném terminálu), pak: node scripts/smoke-test.cjs  (vyžaduje Playwright: npm i -D playwright && npx playwright install chromium)
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT = require('path').resolve(__dirname, '../screenshots-tmp');
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitText(page, sel, expected, timeout = 1000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const txt = await page.locator(sel).first().textContent().catch(() => null);
    if (txt != null && txt.trim() === String(expected)) return Date.now() - t0;
    await sleep(20);
  }
  throw new Error(`Timeout: ${sel} != ${expected} (got ${await page.locator(sel).first().textContent().catch(() => '?')})`);
}

(async () => {
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {});
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const errors = [];
  const zapis = await ctx.newPage();
  await zapis.setViewportSize({ width: 390, height: 844 });
  for (const p of [zapis]) p.on('pageerror', (e) => errors.push(e.message));
  await zapis.goto(BASE + '/zapis');
  await zapis.evaluate(() => localStorage.clear());
  await zapis.reload();

  const panel = await ctx.newPage();
  await panel.setViewportSize({ width: 1920, height: 1080 });
  panel.on('pageerror', (e) => errors.push('panel: ' + e.message));
  await panel.goto(BASE + '/panel');
  const overlay = await ctx.newPage();
  await overlay.setViewportSize({ width: 1920, height: 1080 });
  overlay.on('pageerror', (e) => errors.push('overlay: ' + e.message));
  await overlay.goto(BASE + '/overlay');
  await sleep(800);

  console.log('fonts:', await overlay.evaluate(async () => { await document.fonts.ready; return document.fonts.check('800 40px "Barlow Condensed"'); }));

  // scorebug ON z panelu
  await panel.keyboard.press('1');
  await overlay.waitForSelector('.sb');
  console.log('scorebug on');

  // VÝKOP
  await zapis.getByRole('button', { name: /VÝKOP/ }).click();
  // Položení domácích + hráč 12
  await zapis.locator('.zp-score-col').first().locator('.zp-score-btn').first().click();
  await zapis.locator('.zp-jersey', { hasText: /^12/ }).click();
  const tOv = await waitText(overlay, '.sb-home ~ .sb-score .anum > span:not(.anum-out)', 5).catch(async () => waitText(overlay, '.sb-score >> nth=0', '5'));
  const tPn = await waitText(panel, '.pn-score-num >> nth=0', 5);
  console.log(`sync latency: overlay ${tOv} ms, panel ${tPn} ms`);

  // proměněný kop
  await zapis.locator('.zp-score-col').first().locator('.zp-score-btn').nth(1).click();
  await zapis.locator('.zp-sheet-none').click();
  await waitText(panel, '.pn-score-num >> nth=0', 7);
  // trestný kop hosté bez výběru hráče
  await zapis.locator('.zp-score-col').nth(1).locator('.zp-score-btn').nth(2).click();
  await zapis.locator('.zp-jersey').nth(9).click();
  await waitText(panel, '.pn-score-num >> nth=1', 3);
  // žlutá karta hosté
  await zapis.locator('.zp-actions-col').nth(1).locator('.zp-act-btn').nth(1).click();
  await zapis.locator('.zp-jersey').nth(5).click();
  // střídání domácí
  await zapis.locator('.zp-actions-col').first().locator('.zp-act-btn').first().click();
  await zapis.locator('.zp-jersey', { hasText: /^1[A-Za-zÀ-ž]/ }).first().click();
  await zapis.locator('.zp-jersey', { hasText: /^17/ }).click();
  await sleep(2500);

  // Shoda času na všech obrazovkách
  const clocks = async () => Promise.all([
    zapis.locator('.zp-bar-time').textContent(),
    panel.locator('.pn-clock-time').textContent(),
    overlay.locator('.sb-time').textContent(),
  ]);
  console.log('clocks:', await clocks());

  // Refresh všeho
  await Promise.all([zapis.reload(), panel.reload(), overlay.reload()]);
  await overlay.waitForSelector('.sb');
  await sleep(600);
  console.log('after reload clocks:', await clocks());
  console.log('after reload score panel:', await panel.locator('.pn-score-num').allTextContents());
  console.log('after reload log len:', await zapis.locator('.zp-timeline li').count());
  await zapis.screenshot({ path: OUT + '/zapis-main.png', fullPage: true });

  // UNDO (střídání) a znovu UNDO (žlutá)
  const beforeCards = await panel.locator('.pn-cards li').count();
  await zapis.locator('.zp-undo').click();
  await zapis.locator('.zp-undo').click();
  await sleep(300);
  console.log('cards before/after 2x undo:', beforeCards, await panel.locator('.pn-cards li').count());
  await zapis.locator('.zp-undo').click(); // vrátí trestný kop hostů
  await waitText(panel, '.pn-score-num >> nth=1', 0);
  await waitText(overlay, '.sb-score >> nth=1', '0', 1500).catch((e) => console.log('overlay undo check', e.message));
  console.log('undo OK, score:', await panel.locator('.pn-score-num').allTextContents());

  // znovu data pro screenshoty
  await zapis.locator('.zp-score-col').nth(1).locator('.zp-score-btn').first().click();
  await zapis.locator('.zp-jersey').nth(10).click();
  await zapis.locator('.zp-actions-col').nth(1).locator('.zp-act-btn').nth(1).click();
  await zapis.locator('.zp-jersey').nth(3).click();
  await sleep(700);
  await overlay.screenshot({ path: OUT + '/ov-scorebug-notif.png' });
  await sleep(6500);
  await overlay.screenshot({ path: OUT + '/ov-scorebug.png' });
  await panel.screenshot({ path: OUT + '/panel.png' });

  const shots = [
    ['2', 'intro'], ['3', 'roster-home'], ['4', 'roster-away'], ['5', 'lower-player'], ['6', 'lower-official'], ['7', 'halftime'], ['8', 'fulltime'],
  ];
  for (const [key, name] of shots) {
    await panel.keyboard.press(key);
    await sleep(1400);
    await overlay.screenshot({ path: `${OUT}/ov-${name}.png` });
    // overflow kontrola: prvky přesahující 1920x1080 nebo text přetékající svůj box
    const issues = await overlay.evaluate(() => {
      const out = [];
      document.querySelectorAll('.ov-root *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0) return;
        if (r.right > 1920.5 || r.bottom > 1080.5 || r.left < -0.5 || r.top < -0.5) out.push('outside: ' + el.className);
        const cs = getComputedStyle(el);
        if (el.scrollWidth > el.clientWidth + 1 && cs.overflow !== 'visible' && cs.textOverflow !== 'ellipsis' && el.children.length === 0) out.push('clip: ' + el.className + ' ' + el.textContent);
      });
      return out.slice(0, 10);
    });
    console.log(name, issues.length ? issues : 'OK');
    if (key === '5' || key === '6') await panel.keyboard.press(key); // skrýt titulek
  }
  await panel.keyboard.press('Escape');
  await sleep(800);
  console.log('after Esc graphics in DOM:', await overlay.locator('.fx').count());
  // ── Poločasy a odpočet karet ──
  zapis.on('dialog', (d) => d.accept());
  await panel.keyboard.press('1'); // scorebug zpět
  await zapis.getByRole('button', { name: /STOP/ }).click();
  const c1 = await panel.locator('.pn-cards-time').first().textContent();
  await sleep(1600);
  const c2 = await panel.locator('.pn-cards-time').first().textContent();
  console.log('yellow countdown while stopped (should equal):', c1, c2);
  await zapis.getByRole('button', { name: /Konec 1. poločasu/ }).click();
  await sleep(400);
  console.log('HT overlay clock:', await overlay.locator('.sb-time').textContent());
  await zapis.getByRole('button', { name: /START 2. POL/ }).click();
  await sleep(1200);
  console.log('H2 clocks:', await clocks());
  await sleep(1000);
  const c3 = await panel.locator('.pn-cards-time').first().textContent();
  console.log('yellow countdown running again (should be lower):', c3);
  await overlay.screenshot({ path: OUT + '/ov-scorebug-h2.png' });
  await zapis.screenshot({ path: OUT + '/zapis-h2.png' });

  console.log('after Esc graphics in DOM:', await overlay.locator('.fx').count());
  await panel.screenshot({ path: OUT + '/panel-idle.png' });
  console.log('scroll overflow overlay:', await overlay.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight, getComputedStyle(document.body).backgroundColor]));
  console.log('errors:', errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
