// Prueba de navegador del panel del organizador: carga /organizer, verifica
// que existan los botones "Actualizar" y "Exportar XLSX", hace clic en
// Actualizar y confirma que el GET /api/final-results responde 200 sin
// errores de página.
// Uso: npx tsx --env-file=.env scripts/verify-organizer-ui.ts [base]

import puppeteer from 'puppeteer-core';
import { SignJWT } from 'jose';
import { runQuery, fieldEquals } from '../src/lib/firestore-rest';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = process.argv[2] ?? 'http://localhost:9002';

async function main() {
  const organizers = await runQuery<any>({
    from: [{ collectionId: 'users' }],
    where: fieldEquals('role', 'Organizer'),
    limit: 1,
  });
  const organizer = organizers[0];
  if (!organizer) throw new Error('No hay usuario Organizer');

  const key = new TextEncoder().encode(process.env.SESSION_SECRET!);
  const jwt = await new SignJWT({ user: organizer })
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
  const logs: string[] = [];
  page.on('pageerror', (e: any) => logs.push(`[pageerror] ${e.message}`));
  page.on('response', (r) => {
    if (r.url().includes('/api/')) {
      logs.push(`[${r.request().method()} ${r.status()}] ${r.url()}`);
    }
  });

  await page.setCookie({ name: 'session', value: jwt, url: BASE });
  await page.goto(`${BASE}/organizer`, {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });

  const buttons = await page.evaluate(() =>
    [...document.querySelectorAll('button')].map((b) => b.textContent?.trim())
  );
  const hasRefresh = buttons.some((t) => t?.includes('Actualizar'));
  const hasExport = buttons.some((t) => t?.includes('Exportar XLSX'));
  console.log('Botón Actualizar presente:', hasRefresh);
  console.log('Botón Exportar XLSX presente:', hasExport);

  const clicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Actualizar')
    );
    if (!btn) return false;
    (btn as HTMLButtonElement).click();
    return true;
  });
  await new Promise((r) => setTimeout(r, 5000));
  const status = await page.evaluate(
    () => document.body.innerText.match(/Actualizado a las [^\n]+/)?.[0] ?? ''
  );
  console.log('Clic en Actualizar:', clicked);
  console.log('Texto de confirmación:', status || '(no apareció)');
  console.log(logs.join('\n') || '(sin llamadas /api ni errores)');

  await browser.close();
}

main().catch((e: any) => {
  console.error(e);
  process.exit(1);
});
