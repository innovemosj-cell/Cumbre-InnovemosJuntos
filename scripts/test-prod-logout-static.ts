// Contraparte de test-prod-actions: el MISMO logout (server action) pero
// desde /dashboard (ruta estática). Si aquí el POST devuelve 200 y la cookie
// se borra, queda demostrado que el bug es exclusivo de rutas dinámicas.
// Uso: npx tsx --env-file=.env scripts/test-prod-logout-static.ts [base]

import puppeteer from 'puppeteer-core';
import { SignJWT } from 'jose';
import { runQuery, fieldEquals } from '../src/lib/firestore-rest';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = process.argv[2] ?? 'https://clasificacion-hackathon.pages.dev';

async function main() {
  const admins = await runQuery<any>({
    from: [{ collectionId: 'users' }],
    where: fieldEquals('role', 'Admin'),
    limit: 1,
  });
  const admin = admins[0];
  if (!admin) throw new Error('No hay admin');

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
  page.on('pageerror', (e: any) => logs.push(`[pageerror] ${e.message}`));
  page.on('response', (r) => {
    if (r.request().method() === 'POST') {
      logs.push(`[POST ${r.status()}] ${r.url()}`);
    }
  });

  await page.setCookie({ name: 'session', value: jwt, url: BASE });
  await page.goto(`${BASE}/dashboard`, {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });
  await page.click('button.rounded-full');
  await new Promise((r) => setTimeout(r, 800));
  const clicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Cerrar sesión')
    );
    if (!btn) return false;
    (btn as HTMLButtonElement).click();
    return true;
  });
  await new Promise((r) => setTimeout(r, 8000));
  const cookies = await page.cookies(BASE);
  const sessionCookie = cookies.find((c) => c.name === 'session');
  console.log('--- Logout en ruta ESTÁTICA (/dashboard) ---');
  console.log('Botón encontrado y clicado:', clicked);
  console.log('URL final:', page.url());
  console.log(
    'Cookie de sesión tras logout:',
    sessionCookie && sessionCookie.value
      ? `SIGUE VIVA (${sessionCookie.value.length} chars)`
      : 'borrada OK'
  );
  console.log(logs.join('\n') || '(sin POSTs/errores)');

  await browser.close();
}

main().catch((e: any) => {
  console.error(e);
  process.exit(1);
});
