// Prueba empírica en PRODUCCIÓN de la hipótesis: las Server Actions fallan
// (POST 404) solo en páginas de ruta dinámica ([id]); en rutas estáticas
// funcionan. Dos pruebas inocuas:
//  A) /admin/criterios (estática): re-guardar los criterios finales con sus
//     mismos valores (escribe 5 docs idénticos, sin cambio real).
//  B) /ideas/[id] (dinámica): cerrar sesión con una sesión de prueba y
//     verificar si la cookie realmente se borra.
// Uso: npx tsx --env-file=.env scripts/test-prod-actions.ts [base]

import puppeteer from 'puppeteer-core';
import { SignJWT } from 'jose';
import { runQuery, fieldEquals } from '../src/lib/firestore-rest';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = process.argv[2] ?? 'https://clasificacion-hackathon.pages.dev';
const IDEA_ID = '115-conciliador-ia-de-convenios'; // inactiva, solo la ve el admin

async function mintSession(user: any): Promise<string> {
  const key = new TextEncoder().encode(process.env.SESSION_SECRET!);
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
}

async function main() {
  const admins = await runQuery<any>({
    from: [{ collectionId: 'users' }],
    where: fieldEquals('role', 'Admin'),
    limit: 1,
  });
  const admin = admins[0];
  if (!admin) throw new Error('No hay admin');

  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox'],
  });

  // --- Prueba A: server action en ruta ESTÁTICA (/admin/criterios) ---
  {
    const page = await browser.newPage();
    const logs: string[] = [];
    page.on('pageerror', (e: any) => logs.push(`[pageerror] ${e.message}`));
    page.on('response', (r) => {
      if (r.request().method() === 'POST') {
        logs.push(`[POST ${r.status()}] ${r.url()}`);
      }
    });
    await page.setCookie({
      name: 'session',
      value: await mintSession(admin),
      url: BASE,
    });
    await page.goto(`${BASE}/admin/criterios`, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });
    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Guardar criterios finales')
      );
      if (!btn) return false;
      (btn as HTMLButtonElement).click();
      return true;
    });
    await new Promise((r) => setTimeout(r, 10000));
    const bodyText = await page.evaluate(() =>
      document.body.innerText.includes('Application error')
        ? 'APPLICATION ERROR'
        : 'sin error visible'
    );
    console.log('--- A) Action en ruta estática (/admin/criterios) ---');
    console.log('Botón encontrado y clicado:', clicked);
    console.log('Estado de la página:', bodyText);
    console.log(logs.join('\n') || '(sin POSTs/errores)');
    await page.close();
  }

  // --- Prueba B: logout (server action) en ruta DINÁMICA (/ideas/[id]) ---
  {
    const page = await browser.newPage();
    const logs: string[] = [];
    page.on('pageerror', (e: any) => logs.push(`[pageerror] ${e.message}`));
    page.on('response', (r) => {
      if (r.request().method() === 'POST') {
        logs.push(`[POST ${r.status()}] ${r.url()}`);
      }
    });
    await page.setCookie({
      name: 'session',
      value: await mintSession(admin),
      url: BASE,
    });
    await page.goto(`${BASE}/ideas/${IDEA_ID}`, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });
    // Abrir el menú del avatar y pulsar "Cerrar sesión"
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
    console.log('--- B) Logout en ruta dinámica (/ideas/[id]) ---');
    console.log('Botón encontrado y clicado:', clicked);
    console.log('URL final:', page.url());
    console.log(
      'Cookie de sesión tras logout:',
      sessionCookie ? `SIGUE VIVA (${sessionCookie.value.length} chars)` : 'borrada OK'
    );
    console.log(logs.join('\n') || '(sin POSTs/errores)');
    await page.close();
  }

  await browser.close();
}

main().catch((e: any) => {
  console.error(e);
  process.exit(1);
});
