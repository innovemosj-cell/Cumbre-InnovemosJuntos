// Verifica los dos ajustes:
//  A. Orden estable de "Jurados que han Votado": clic en Actualizar dos veces
//     no debe reorganizar la lista.
//  B. Borrado de perfiles desde el admin: API (protecciones) + UI con diálogo
//     de confirmación, usando un usuario de PRUEBA creado por este script.
// Lecturas directas: 2 runQuery (admin y organizer, limit 1). Escrituras: 1
// create + el delete que hace la propia API.
// Uso: npx tsx --env-file=.env scripts/verify-delete-user-y-orden.ts [base]

import puppeteer from 'puppeteer-core';
import { SignJWT } from 'jose';
import { runQuery, fieldEquals, setDoc, getDoc } from '../src/lib/firestore-rest';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = process.argv[2] ?? 'http://localhost:9002';
const TEST_ID = 'zz-test-borrar-perfil';

async function mintJwt(role: string) {
  const users = await runQuery<any>({
    from: [{ collectionId: 'users' }],
    where: fieldEquals('role', role),
    limit: 1,
  });
  if (!users[0]) throw new Error(`No hay usuario ${role}`);
  const key = new TextEncoder().encode(process.env.SESSION_SECRET!);
  const jwt = await new SignJWT({ user: users[0] })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
  return { jwt, user: users[0] };
}

async function main() {
  const admin = await mintJwt('Admin');
  const organizer = await mintJwt('Organizer');

  // ===== A. Orden estable en la tarjeta de votantes =====
  const snap = (await (
    await fetch(`${BASE}/api/final-results`, {
      headers: { cookie: `session=${organizer.jwt}` },
    })
  ).json()) as { ideas: { id: string; finalRatings: Record<string, any> }[] };
  const idea = snap.ideas.find(
    (i) => Object.keys(i.finalRatings).length >= 3
  );
  if (!idea) throw new Error('No hay ideas con 3+ votos finales');

  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setCookie({ name: 'session', value: organizer.jwt, url: BASE });
  await page.goto(`${BASE}/ideas/${idea.id}`, {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });

  const getOrder = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('ul li p.font-medium')].map(
        (p) => p.textContent
      )
    );
  const clickRefresh = async () => {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Actualizar')
      ) as HTMLButtonElement;
      btn?.click();
    });
    await new Promise((r) => setTimeout(r, 4000));
  };

  const before = await getOrder();
  await clickRefresh();
  const after1 = await getOrder();
  await clickRefresh();
  const after2 = await getOrder();
  const stable =
    JSON.stringify(before) === JSON.stringify(after1) &&
    JSON.stringify(after1) === JSON.stringify(after2);
  console.log(`A. Orden inicial (${before.length}): ${before.join(' | ')}`);
  console.log(`   Estable tras 2 clics: ${stable ? 'sí ✅' : 'NO ⚠️'}`);
  if (!stable) {
    console.log(`   tras clic 1: ${after1.join(' | ')}`);
    console.log(`   tras clic 2: ${after2.join(' | ')}`);
  }

  // ===== B. Borrado de perfiles =====
  // Usuario de prueba desechable.
  await setDoc(`users/${TEST_ID}`, {
    name: 'ZZ Prueba Borrar',
    email: 'zz-prueba@test.local',
    role: 'Equipo',
    avatarUrl: '',
    loginCode: '0000',
    active: false,
  });
  console.log(`\nB. Usuario de prueba creado: ${TEST_ID}`);

  // B1: sin rol Admin -> 403.
  const resOrg = await fetch(`${BASE}/api/delete-user`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `session=${organizer.jwt}`,
    },
    body: JSON.stringify({ userId: TEST_ID }),
  });
  console.log(`   Organizer intenta borrar -> ${resOrg.status} (esperado 403)`);

  // B2: admin no puede borrarse a sí mismo.
  const resSelf = await fetch(`${BASE}/api/delete-user`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `session=${admin.jwt}`,
    },
    body: JSON.stringify({ userId: admin.user.id }),
  });
  console.log(`   Admin se borra a sí mismo -> ${resSelf.status} (esperado 400)`);

  // B3: UI con diálogo de confirmación.
  await page.setCookie({ name: 'session', value: admin.jwt, url: BASE });
  await page.goto(`${BASE}/admin/users`, {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });
  await page.type('input[placeholder*="Buscar"]', 'ZZ Prueba');
  await new Promise((r) => setTimeout(r, 800));
  const trashClicked = await page.evaluate(() => {
    const btn = document.querySelector(
      'button[aria-label*="Borrar perfil de ZZ Prueba"]'
    ) as HTMLButtonElement | null;
    btn?.click();
    return !!btn;
  });
  await new Promise((r) => setTimeout(r, 800));
  const dialogText = await page.evaluate(
    () =>
      document.querySelector('[role="alertdialog"]')?.textContent ?? ''
  );
  console.log(`   Botón papelera clicado: ${trashClicked}`);
  console.log(
    `   Diálogo de confirmación visible: ${dialogText.includes('¿Borrar este perfil?')}`
  );
  console.log(
    `   Menciona al usuario: ${dialogText.includes('ZZ Prueba Borrar')}`
  );
  // Confirmar.
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Sí, borrar perfil')
    ) as HTMLButtonElement;
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 4000));
  // El toast de éxito contiene el nombre, así que la fila se detecta por el
  // correo, que solo aparece en la tabla.
  const rowGone = await page.evaluate(
    () => !document.body.innerText.includes('zz-prueba@test.local')
  );
  const docGone = (await getDoc(`users/${TEST_ID}`)) === null;
  console.log(`   Fila desaparece de la tabla: ${rowGone}`);
  console.log(`   Doc borrado en Firestore: ${docGone ? 'sí ✅' : 'NO ⚠️'}`);

  await browser.close();
  if (!docGone) {
    console.log('   (limpieza pendiente: borra users/' + TEST_ID + ' a mano)');
  }
}

main().catch((e: any) => {
  console.error(e);
  process.exit(1);
});
