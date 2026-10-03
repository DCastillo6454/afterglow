// Headless smoke + interaction tests. Requires `npm run serve` in another terminal.
// Usage: npm test   (SHOTS=<dir> to also save full-page screenshots)
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const URL = process.env.SITE_URL || 'http://localhost:5173/';
const SHOTS = process.env.SHOTS;
const browserPath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '  ✓' : '  ✗'} ${msg}`); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: browserPath, headless: true });

async function openPage({ width, height, mobile = false, reducedMotion = false, js = true }) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.setJavaScriptEnabled(js);
  await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }]);
  await page.goto(URL, { waitUntil: 'networkidle0' });
  return { page, errors };
}

async function loadAllLazy(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 80)); }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForNetworkIdle({ idleTime: 300 });
  await sleep(900); // let reveal transitions finish
}

/* ---------- Layout at three widths ---------- */
for (const vp of [
  { name: 'mobile', width: 375, height: 812, mobile: true },
  { name: 'tablet', width: 768, height: 1024, mobile: true },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  console.log(`\nLayout: ${vp.name} ${vp.width}px`);
  const { page, errors } = await openPage(vp);
  await loadAllLazy(page);
  const m = await page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [...document.querySelectorAll('body *')]
      .filter((el) => !el.closest('.overlay, .ribbon, .glow-bg, dialog') && el.getBoundingClientRect().right > doc.clientWidth + 1)
      .slice(0, 5).map((el) => el.className || el.tagName);
    const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && !i.closest('dialog')).map((i) => i.src);
    const formats = new Set([...document.images].map((i) => i.currentSrc.split('.').pop()).filter(Boolean));
    const smallTargets = [...document.querySelectorAll('a, button, input, [tabindex="0"]')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && !el.closest('dialog') && !el.classList.contains('skip-link') && (r.height < 40 || r.width < 40) && el.type !== 'checkbox' && el.type !== 'radio'; })
      .map((el) => el.textContent.trim().slice(0, 30) || el.tagName);
    return { overflow: doc.scrollWidth > doc.clientWidth, offenders, broken, formats: [...formats], smallTargets, height: doc.scrollHeight };
  });
  ok(!m.overflow, `no horizontal scroll ${m.overflow ? JSON.stringify(m.offenders) : ''}`);
  ok(m.broken.length === 0, `all images decoded ${m.broken.join(', ')}`);
  ok(m.formats.includes('avif'), `responsive AVIF served (${m.formats.join(', ')})`);
  ok(m.smallTargets.length === 0, `touch targets ≥ 40px ${m.smallTargets.join(' | ')}`);
  ok(errors.length === 0, `no console/network errors ${errors.join(' | ')}`);
  if (SHOTS) {
    mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, `${vp.name}.png`), fullPage: true });
  }
  await page.close();
}

/* ---------- Keyboard, nav and flows (mobile) ---------- */
console.log('\nInteractions: mobile');
{
  const { page, errors } = await openPage({ width: 375, height: 812, mobile: true });
  await page.keyboard.press('Tab');
  ok(await page.evaluate(() => document.activeElement.classList.contains('skip-link')), 'first Tab reaches skip link');
  const navHidden = () => page.$eval('#site-nav', (n) => n.hidden);
  ok(await navHidden(), 'mobile nav collapsed by default');
  await page.click('.nav-toggle');
  ok(!(await navHidden()) && (await page.$eval('.nav-toggle', (b) => b.getAttribute('aria-expanded'))) === 'true', 'menu button opens nav (aria-expanded=true)');
  await page.keyboard.press('Escape');
  ok((await navHidden()) && (await page.evaluate(() => document.activeElement.classList.contains('nav-toggle'))), 'Escape closes nav and returns focus to button');
  await page.click('.nav-toggle');
  await page.click('#site-nav a[href="#passes"]');
  await sleep(1200); // allow smooth scroll to settle
  ok(await navHidden(), 'choosing a nav link closes the menu');

  // Demo checkout
  await page.$eval('[data-checkout="vip"]', (b) => b.scrollIntoView({ block: 'center' }));
  await page.click('[data-checkout="vip"]');
  ok(await page.$eval('#checkout', (d) => d.open), 'pass button opens checkout dialog');
  ok(await page.$eval('input[name="tier"][value="vip"]', (r) => r.checked), 'selected tier preselected (VIP)');
  ok(await page.evaluate(() => document.activeElement.id === 'checkout-name'), 'focus moves to first field');
  await page.click('#checkout-form button[type="submit"]');
  const errs = await page.$$eval('#checkout-form .field__error', (els) => els.map((e) => e.textContent).filter(Boolean));
  ok(errs.length === 3, `empty submit shows 3 errors (${errs.length})`);
  ok(await page.$eval('#checkout-name', (i) => i.getAttribute('aria-invalid') === 'true' && document.activeElement === i), 'invalid field marked aria-invalid and focused');
  await page.type('#checkout-name', 'Test Visitor');
  await page.type('#checkout-email', 'not-an-email');
  await page.click('#checkout-ack');
  await page.click('#checkout-form button[type="submit"]');
  ok((await page.$eval('#checkout-email-error', (e) => e.textContent)).includes('format'), 'malformed email rejected');
  await page.$eval('#checkout-email', (i) => { i.value = ''; });
  await page.type('#checkout-email', 'visitor@example.com');
  await page.click('#checkout-form button[type="submit"]');
  ok(await page.$eval('[data-step="processing"]', (s) => !s.hidden), 'processing state with loader shown');
  await page.waitForFunction(() => !document.querySelector('[data-step="success"]').hidden, { timeout: 4000 });
  const success = await page.evaluate(() => ({ text: document.querySelector('#checkout-success-text').textContent, focus: document.activeElement.id }));
  ok(success.text.includes('VIP') && /Nothing was charged/.test(success.text), 'success copy names tier and states nothing was charged');
  ok(success.focus === 'checkout-success-title', 'focus moves to success heading');
  await page.keyboard.press('Escape');
  ok(!(await page.$eval('#checkout', (d) => d.open)), 'Escape closes checkout');
  ok(await page.evaluate(() => document.activeElement.dataset.checkout === 'vip'), 'focus returns to the pass button');

  // Reopen: should reset to form step
  await page.click('[data-checkout="ga"]');
  ok(await page.evaluate(() => !document.querySelector('#checkout-form').hidden && document.querySelector('input[value="ga"]').checked && !document.querySelector('#checkout-name').value), 'reopening resets the demo to a clean form');
  await page.click('#checkout .icon-btn');

  // Signup
  await page.$eval('#signup-email', (i) => i.scrollIntoView({ block: 'center' }));
  await page.type('#signup-email', 'bad@');
  await page.click('#signup-form button[type="submit"]');
  ok((await page.$eval('#signup-email-error', (e) => e.textContent)) !== '', 'signup rejects invalid email');
  await page.$eval('#signup-email', (i) => { i.value = ''; });
  await page.type('#signup-email', 'fan@example.com');
  await page.click('#signup-form button[type="submit"]');
  const s = await page.evaluate(() => ({ shown: !document.querySelector('#signup-result').hidden, formHidden: document.querySelector('#signup-form').hidden, status: document.querySelector('#signup-status').textContent, focus: document.activeElement.id }));
  ok(s.shown && s.formHidden && s.status.includes('nothing was sent'), 'signup shows confirmation art + demo disclaimer');
  ok(s.focus === 'signup-status', 'focus moves to signup status');
  await page.click('#signup-reset');
  ok(await page.evaluate(() => !document.querySelector('#signup-form').hidden && document.activeElement.id === 'signup-email'), 'reset restores the form');

  // Lightbox
  await page.$eval('#map .map-figure__btn', (b) => b.scrollIntoView({ block: 'center' }));
  await page.click('#map .map-figure__btn');
  await page.waitForFunction(() => document.querySelector('#lightbox-img').complete && document.querySelector('#lightbox-img').naturalWidth > 0);
  ok(await page.evaluate(() => document.querySelector('#lightbox').open && document.querySelector('#lightbox-img').alt.length > 20), 'map viewer opens with alt text');
  await sleep(150);
  const scaleOf = () => page.$eval('#lightbox-img', (i) => new DOMMatrix(getComputedStyle(i).transform).a);
  const transformOf = () => page.$eval('#lightbox-img', (i) => i.style.transform);
  const fitScale = await page.evaluate(() => {
    const s = document.querySelector('#viewer-stage'); const i = document.querySelector('#lightbox-img');
    return Math.min(s.clientWidth / i.naturalWidth, s.clientHeight / i.naturalHeight);
  });
  const startScale = await scaleOf();
  ok(startScale > fitScale * 1.8, `map opens filled to stage height on mobile (${(startScale / fitScale).toFixed(1)}× fit)`);
  const rendered = await page.$eval('#lightbox-img', (i) => i.getBoundingClientRect().width);
  ok(rendered >= 768, `map labels legible: rendered ${Math.round(rendered)}px wide on a 375px screen`);
  await page.click('[data-zoom-in]'); await sleep(300);
  ok((await scaleOf()) > startScale, 'zoom-in button enlarges the map');
  const beforeDrag = await transformOf();
  const box = await page.$eval('#viewer-stage', (s) => { const r = s.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(box.x, box.y); await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 60, { steps: 6 }); await page.mouse.up();
  ok((await transformOf()) !== beforeDrag, 'dragging pans the map');
  await page.focus('#viewer-stage');
  const beforeKey = await transformOf();
  await page.keyboard.press('ArrowRight'); await sleep(300);
  ok((await transformOf()) !== beforeKey, 'arrow keys pan the map');
  await page.click('[data-zoom-reset]'); await sleep(300);
  ok(Math.abs((await scaleOf()) - fitScale) < 0.01, 'fit button shows the whole map');
  ok(await page.$eval('#viewer-full', (a) => a.href.endsWith('festival-map-1536.webp')), 'full-resolution link offered');
  await page.keyboard.press('Escape');
  ok(await page.evaluate(() => !document.querySelector('#lightbox').open && document.activeElement.classList.contains('map-figure__btn')), 'viewer closes and restores focus');

  ok(errors.length === 0, `no errors during interactions ${errors.join(' | ')}`);
  await page.close();
}

/* ---------- Reduced motion ---------- */
console.log('\nReduced motion (desktop)');
{
  const { page } = await openPage({ width: 1280, height: 800, reducedMotion: true });
  await page.mouse.move(300, 300);
  const r = await page.evaluate(() => ({
    hiddenReveals: [...document.querySelectorAll('.reveal')].filter((el) => getComputedStyle(el).opacity !== '1').length,
    smokeAnim: getComputedStyle(document.querySelector('.overlay--smoke')).animationName,
    spark: !!document.querySelector('.ag-cursor-spark'),
    smooth: getComputedStyle(document.documentElement).scrollBehavior,
  }));
  ok(r.hiddenReveals === 0, 'content visible without reveal animation');
  ok(r.smokeAnim === 'none', 'overlay drift disabled');
  ok(!r.spark, 'decorative cursor not created');
  ok(r.smooth === 'auto', 'smooth scrolling disabled');
  await page.close();
}
{
  const { page } = await openPage({ width: 1280, height: 800 });
  await page.mouse.move(300, 300);
  ok(await page.evaluate(() => !!document.querySelector('.ag-cursor-spark')), 'cursor spark present when motion allowed (fine pointer)');
  await page.close();
}

/* ---------- No JavaScript ---------- */
console.log('\nNo JavaScript (mobile)');
{
  const { page } = await openPage({ width: 375, height: 812, mobile: true, js: false });
  const r = await page.evaluate(() => ({
    navVisible: getComputedStyle(document.querySelector('#site-nav')).display !== 'none',
    toggleHidden: getComputedStyle(document.querySelector('.nav-toggle')).display === 'none',
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  ok(r.navVisible && r.toggleHidden, 'navigation links visible, unusable toggle hidden');
  ok(!r.overflow, 'no horizontal scroll without JS');
  await page.close();
}

/* ---------- Mobile image viewer at small widths ---------- */
console.log('\nImage viewer on small phones');
for (const width of [320, 375, 390]) {
  const { page, errors } = await openPage({ width, height: 780, mobile: true });
  await page.$eval('.map-figure__btn', (b) => b.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForNetworkIdle({ idleTime: 300 });
  await page.click('.map-figure__btn');
  await page.waitForFunction(() => document.querySelector('#lightbox-img').naturalWidth > 0);
  // Let any late layout from lazy images settle so only the gesture is measured.
  await page.waitForFunction(() => new Promise((res) => { const y = scrollY; setTimeout(() => res(scrollY === y), 250); }));
  const before = await page.evaluate(() => scrollY);
  const r = await page.evaluate(() => {
    const d = document.querySelector('#lightbox');
    const btns = [...d.querySelectorAll('.viewer__bar button')].map((b) => b.getBoundingClientRect());
    return {
      inside: btns.every((b) => b.left >= 0 && b.right <= innerWidth && b.width >= 40 && b.height >= 40),
      dialogFits: d.scrollWidth <= d.clientWidth,
      docFits: document.documentElement.scrollWidth <= innerWidth,
      locked: getComputedStyle(document.documentElement).overflowY === 'hidden',
    };
  });
  // A real touch scroll over the viewer must not move the page underneath.
  const cdp = await page.target().createCDPSession();
  await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(width / 2), y: 760, yDistance: -400, gestureSourceType: 'touch' });
  await sleep(300);
  const moved = (await page.evaluate(() => scrollY)) !== before;
  ok(r.inside && r.dialogFits && r.docFits, `${width}px: whole toolbar visible, no horizontal overflow`);
  ok(r.locked && !moved, `${width}px: page behind the viewer does not scroll`);
  await page.click('#lightbox [data-close]');
  await sleep(200);
  ok(await page.evaluate(() => !document.querySelector('#lightbox').open && getComputedStyle(document.documentElement).overflowY !== 'hidden'), `${width}px: close button works and scroll is restored`);
  ok(errors.length === 0, `${width}px: no errors ${errors.join(' | ')}`);
  await page.close();
}

/* ---------- Experience scenes open in the viewer ---------- */
console.log('\nExperience scenes in the viewer');
for (const [width, mobile] of [[1440, false], [375, true]]) {
  const { page, errors } = await openPage({ width, height: 900, mobile });
  for (const cls of ['vista__main', 'vista__solar', 'vista__pulse', 'vista__art']) {
    const sel = `.${cls} .vista__btn`;
    await page.$eval(sel, (b) => b.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const label = await page.$eval(sel, (b) => b.getAttribute('aria-label'));
    // Keyboard: focus the button and press Enter.
    await page.focus(sel);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#lightbox').open && document.querySelector('#lightbox-img').naturalWidth > 0);
    const v = await page.evaluate(() => ({
      src: document.querySelector('#lightbox-img').src,
      alt: document.querySelector('#lightbox-img').alt,
      caption: document.querySelector('#viewer-caption').textContent,
      natural: document.querySelector('#lightbox-img').naturalWidth,
    }));
    const okOpen = /scene-\w+-1536\.webp$/.test(v.src) && v.natural === 1536 && v.alt.startsWith('Concept render') && v.caption.length > 0;
    await page.keyboard.press('Escape');
    await sleep(150);
    const returned = await page.evaluate((s) => !document.querySelector('#lightbox').open && document.activeElement === document.querySelector(s), sel);
    ok(/^Enlarge .+ concept render$/.test(label) && okOpen && returned, `${width}px ${cls}: "${label}" opens 1536px render via Enter; Esc returns focus`);
  }
  // Pointer: a tap on the caption overlay still reaches the button underneath.
  const cap = await page.$eval('.vista__solar span', (s) => { s.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = s.getBoundingClientRect(); return { x: r.x + 20, y: r.y + r.height - 10 }; });
  await page.mouse.click(cap.x, cap.y);
  await page.waitForFunction(() => document.querySelector('#lightbox').open);
  ok((await page.$eval('#lightbox-img', (i) => i.src)).includes('scene-solar-1536'), `${width}px: clicking the caption area opens the Solar render`);
  await page.click('#lightbox [data-close]');
  await sleep(150);
  ok(errors.length === 0, `${width}px: no errors ${errors.join(' | ')}`);
  await page.close();
}

/* ---------- Design constraints from review ---------- */
console.log('\nDesign constraints');
{
  const { page } = await openPage({ width: 375, height: 812, mobile: true });
  const passesH = await page.$eval('#passes', (s) => s.offsetHeight);
  ok(passesH < 1500, `mobile pass section is compact (${passesH}px)`);
  ok(await page.evaluate(() => document.fonts.check('700 16px "Chakra Petch"')), 'Chakra Petch display font loaded');
  await page.close();
}
{
  const { page } = await openPage({ width: 1440, height: 900 });
  await loadAllLazy(page);
  const r = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.vista img')];
    const head = document.querySelector('.passes-head .section__title').getBoundingClientRect();
    const fig = document.querySelector('.passes-head figure').getBoundingClientRect();
    const textTop = document.querySelector('.passes-head .eyebrow').getBoundingClientRect().top;
    return {
      scenes: imgs.length === 4 && imgs.every((i) => /scene-/.test(i.currentSrc) && i.naturalWidth > 0),
      noMapCrops: !document.querySelector('img[src*="exp-"]'),
      gap: Math.round(textTop - fig.top), headInsideFig: head.top < fig.bottom,
    };
  });
  ok(r.scenes && r.noMapCrops, 'Experience uses the four dedicated scene illustrations');
  ok(Math.abs(r.gap) < 120 && r.headInsideFig, `passes intro balanced beside wristbands (text starts ${r.gap}px from image top)`);
  await page.close();
}
for (const width of [1024, 1280, 1440, 1920]) {
  const { page } = await openPage({ width, height: 900 });
  const r = await page.evaluate(() => {
    const el = document.querySelector('.hero__headliner');
    const name = el.getBoundingClientRect();
    const logo = document.querySelector('.hero__logo').getBoundingClientRect();
    return { lines: Math.round(name.height / (parseFloat(getComputedStyle(el).fontSize) * 0.95)), nameW: name.width, logoW: logo.width };
  });
  ok(r.lines === 1 && r.logoW > r.nameW * 1.3, `${width}px hero: headliner on one line, logo leads (${Math.round(r.logoW)} vs ${Math.round(r.nameW)}px)`);
  await page.close();
}

/* ---------- Static accessibility checks ---------- */
console.log('\nAccessibility basics');
{
  const { page } = await openPage({ width: 1280, height: 800 });
  const a = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
    const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.querySelector('img')?.alt || '').trim();
    const headings = [...document.querySelectorAll('h1,h2,h3,h4')].filter((h) => !h.closest('dialog')).map((h) => +h.tagName[1]);
    const skips = headings.filter((lvl, i) => i > 0 && lvl > headings[i - 1] + 1).length;
    const text = document.body.innerText;
    return {
      missingAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
      dupIds: ids.filter((id, i) => ids.indexOf(id) !== i),
      unnamed: [...document.querySelectorAll('button, a')].filter((el) => !name(el)).length,
      unlabeled: [...document.querySelectorAll('input')].filter((i) => !i.labels?.length && !i.getAttribute('aria-label')).length,
      h1: document.querySelectorAll('h1').length,
      skips,
      artists: ['VYRA NOR', 'NIGHTDRIVE', 'LUNA VEX', 'KAIRO', 'JAX XEN', 'BLKOUT', 'AYLA RAE'].every((n) => text.includes(n)),
      noPrices: !/\$\s?\d|USD|€\s?\d/.test(text),
      noYear: !/\b20\d\d\b/.test(text),
    };
  });
  ok(a.missingAlt === 0, 'every image has an alt attribute');
  ok(a.dupIds.length === 0, `no duplicate ids ${a.dupIds}`);
  ok(a.unnamed === 0, 'every link/button has an accessible name');
  ok(a.unlabeled === 0, 'every input is labelled');
  ok(a.h1 === 1 && a.skips === 0, 'one h1 and no skipped heading levels');
  ok(a.artists, 'all seven artist names present as HTML text');
  ok(a.noPrices && a.noYear, 'no invented prices or event year in page text');
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
