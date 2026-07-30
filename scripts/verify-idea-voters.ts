// Verifica el botón "Actualizar" de la tarjeta "Jurados que han Votado":
//  1. GET /api/idea-voters sin `known` -> devuelve todos los votantes
//  2. GET /api/idea-voters con `known` completo -> newVoters vacío (0 lecturas de users)
//  3. Navegador: /ideas/{id} como Organizer muestra el botón y el clic funciona
// Lecturas directas de este script: 1 (runQuery users limit 1).
// Uso: npx tsx --env-file=.env scripts/verify-idea-voters.ts [base]

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
  const headers = { cookie: `session=${jwt}` };

  // Buscar una idea con votos finales usando el endpoint ya existente.
  const snap = (await (
    await fetch(`${BASE}/api/final-results`, { headers })
  ).json()) as { ideas: { id: string; finalRatings: Record<string, any> }[] };
  const idea = snap.ideas.find((i) => Object.keys(i.finalRatings).length > 0);
  if (!idea) throw new Error('No hay ideas con votos finales');
  const expectedIds = Object.keys(idea.finalRatings).sort();
  console.log(`Idea de prueba: ${idea.id} (${expectedIds.length} votantes)`);

  // --- 1. Sin known: debe traer todos ---
  const res1 = await fetch(
    `${BASE}/api/idea-voters?ideaId=${idea.id}&mode=final`,
    { headers }
  );
  console.log(`GET /api/idea-voters (sin known) -> ${res1.status}`);
  const json1 = (await res1.json()) as { voterIds: string[]; newVoters: any[] };
  console.log(
    `  voterIds: ${json1.voterIds.length}, newVoters: ${json1.newVoters.length}`
  );
  console.log(
    `  ids coinciden con finalRatings: ${
      JSON.stringify([...json1.voterIds].sort()) === JSON.stringify(expectedIds)
    }`
  );
  const leak = json1.newVoters.find((v) => v.loginCode || v.role);
  console.log(`  sin campos sensibles (loginCode/role): ${leak ? 'NO ⚠️' : 'sí'}`);
  console.log(
    `  ejemplo: ${json1.newVoters[0]?.name} <${json1.newVoters[0]?.email}>`
  );

  // --- 2. Con known completo: newVoters debe ser vacío ---
  const res2 = await fetch(
    `${BASE}/api/idea-voters?ideaId=${idea.id}&mode=final&known=${json1.voterIds.join(',')}`,
    { headers }
  );
  const json2 = (await res2.json()) as { voterIds: string[]; newVoters: any[] };
  console.log(
    `GET con known completo -> ${res2.status}, newVoters: ${json2.newVoters.length} (esperado 0)`
  );

  // --- 3. Navegador ---
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
  await page.goto(`${BASE}/ideas/${idea.id}`, {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });

  const hasSection = await page.evaluate(() =>
    document.body.innerText.includes('Jurados que han Votado')
  );
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
  const voterCount = await page.evaluate(
    () => document.querySelectorAll('ul li').length
  );
  console.log(`\nSección "Jurados que han Votado": ${hasSection}`);
  console.log(`Clic en Actualizar: ${clicked}`);
  console.log(`Texto de confirmación: ${status || '(no apareció)'}`);
  console.log(`Jurados listados tras actualizar: ${voterCount}`);
  console.log(logs.join('\n') || '(sin llamadas /api ni errores)');

  await browser.close();
}

main().catch((e: any) => {
  console.error(e);
  process.exit(1);
});
