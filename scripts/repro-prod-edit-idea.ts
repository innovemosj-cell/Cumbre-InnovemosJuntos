// Reproduce en PRODUCCIÓN el error al guardar la edición de una iniciativa,
// capturando la consola del navegador y la respuesta del POST de la Server
// Action. Usa una iniciativa INACTIVA y reenvía sus mismos valores para no
// alterar datos. Lecturas Firestore: 1 (admin) + las de las 2 páginas.
// Uso: npx tsx --env-file=.env scripts/repro-prod-edit-idea.ts

import puppeteer from 'puppeteer-core';
import { SignJWT } from 'jose';
import { runQuery, fieldEquals } from '../src/lib/firestore-rest';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = process.argv[2] ?? 'https://clasificacion-hackathon.pages.dev';
// Iniciativa inactiva conocida (no visible para jurados): edición inocua.
const IDEA_ID = '115-conciliador-ia-de-convenios';

async function main() {
  const admins = await runQuery<any>({
    from: [{ collectionId: 'users' }],
    where: fieldEquals('role', 'Admin'),
    limit: 1,
  });
  const admin = admins[0];
  if (!admin) throw new Error('No hay admin');
  console.log('Admin:', admin.name ?? admin.id);

  const key = new TextEncoder().encode(process.env.SESSION_SECRET!);
  const jwt = await new SignJWT({ user: admin })
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
  page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text()}`));
  page.on('pageerror', (e: any) => logs.push(`[pageerror] ${e.message}`));
  page.on('response', (r) => {
    if (r.request().method() === 'POST') {
      logs.push(`[POST ${r.status()}] ${r.url()}`);
    }
  });

  await page.setCookie({ name: 'session', value: jwt, url: BASE });
  const editUrl = `${BASE}/admin/iniciativas/${IDEA_ID}/edit`;
  const resp = await page.goto(editUrl, {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });
  console.log('GET edit page:', resp?.status(), page.url());

  if (!page.url().includes('/edit')) {
    console.log('No se llegó al formulario (¿SESSION_SECRET distinto en prod?)');
    console.log(logs.join('\n'));
    await browser.close();
    return;
  }

  // Enviar el formulario sin cambios (mismos valores).
  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 12000));

  const bodyText = await page.evaluate(() =>
    document.body.innerText.slice(0, 500)
  );
  console.log('--- Después de guardar ---');
  console.log('URL actual:', page.url());
  console.log('Texto visible (inicio):', bodyText.replace(/\n+/g, ' | ').slice(0, 300));
  console.log('--- Consola / red ---');
  console.log(logs.join('\n'));

  await browser.close();
}

main().catch((e: any) => {
  console.error(e);
  process.exit(1);
});
