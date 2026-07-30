// Reproduce en móvil (emulado) el comportamiento del desplegable de la
// ficha de iniciativa (Problema, Hipótesis IA, etc.).
// Uso: npx tsx --env-file=.env scripts/repro-mobile-info-section.ts

import puppeteer from 'puppeteer-core';
import { SignJWT } from 'jose';
import { runQuery, fieldEquals, listDocs } from '../src/lib/firestore-rest';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:9002';

async function main() {
  const jurors = await runQuery<any>({
    from: [{ collectionId: 'users' }],
    where: fieldEquals('role', 'Jurado'),
    limit: 1,
  });
  const juror = jurors[0];
  if (!juror) throw new Error('No hay jurados');
  const ideas = await listDocs<any>('ideas');
  const idea = ideas.find((i: any) => i.active !== false && (i.problema ?? '').length > 200);
  if (!idea) throw new Error('No hay idea activa con problema largo');
  console.log('Jurado:', juror.name, '| Idea:', idea.id);

  const key = new TextEncoder().encode(process.env.SESSION_SECRET!);
  const jwt = await new SignJWT({ user: juror })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);

  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.emulate({
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const logs: string[] = [];
  page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text()}`));
  page.on('pageerror', (e: any) => logs.push(`[pageerror] ${e.message}`));

  await page.setCookie({ name: 'session', value: jwt, url: BASE });
  await page.goto(`${BASE}/ideas/${idea.id}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.screenshot({ path: 'scripts/shot-1-inicial.png', fullPage: false });

  // Buscar la sección "Problema" y medir
  const info = await page.evaluate(() => {
    const secs = [...document.querySelectorAll('section')];
    const target = secs.find((s) => s.textContent?.trim().startsWith('Indicadores'));
    if (!target) return { found: false };
    const btn = target.querySelector('[role="button"]');
    const p = target.querySelector('p');
    const r = target.getBoundingClientRect();
    return {
      found: true,
      rect: { top: r.top, height: r.height, width: r.width },
      btnTag: btn?.tagName,
      pDisplay: p ? getComputedStyle(p).display : null,
      pHeight: p?.getBoundingClientRect().height,
      docScrollW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
    };
  });
  console.log('Estado inicial:', JSON.stringify(info, null, 1));

  // Scroll hasta la sección y tap
  await page.evaluate(() => {
    const secs = [...document.querySelectorAll('section')];
    const t = secs.find((s) => s.textContent?.trim().startsWith('Indicadores'));
    t?.scrollIntoView({ block: 'center' });
  });
  await new Promise((r) => setTimeout(r, 400));
  const btn = await page.$('section [role="button"][aria-expanded]');
  if (!btn) { console.log('No se encontró el botón aria-expanded'); }
  // Tap táctil real sobre la sección Problema
  const target = (await page.$$('section')).length;
  const handle = await page.evaluateHandle(() => {
    const secs = [...document.querySelectorAll('section')];
    return secs.find((s) => s.textContent?.trim().startsWith('Indicadores'))!.querySelector('[role="button"]');
  });
  const el: any = handle.asElement();
  const before = await page.evaluate((b: any) => b.getAttribute('aria-expanded'), el);
  await el.tap();
  await new Promise((r) => setTimeout(r, 400));
  const after = await page.evaluate((b: any) => b.getAttribute('aria-expanded'), el);
  const afterInfo = await page.evaluate((b: any) => {
    const p = b.querySelector('p');
    return { pHeight: p?.getBoundingClientRect().height, clamped: getComputedStyle(p).webkitLineClamp };
  }, el);
  console.log(`aria-expanded: antes=${before} después=${after}`, JSON.stringify(afterInfo));
  await page.screenshot({ path: 'scripts/shot-2-tras-tap.png', fullPage: false });

  // Segundo tap para cerrar
  await el.tap();
  await new Promise((r) => setTimeout(r, 400));
  const closed = await page.evaluate((b: any) => b.getAttribute('aria-expanded'), el);
  console.log('aria-expanded tras segundo tap:', closed);
  await page.screenshot({ path: 'scripts/shot-3-tras-cerrar.png', fullPage: false });

  console.log('Logs de consola:', logs.length ? logs.slice(0, 10).join('\n') : '(ninguno)');
  await browser.close();
}
main().catch((e) => { console.error('ERROR:', e?.message); process.exit(1); });
