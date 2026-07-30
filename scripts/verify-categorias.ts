// Verifica la funcionalidad de categorías end-to-end contra un localhost:
//   1. /admin/categorias renderiza el editor con las 4 categorías.
//   2. /admin/iniciativas muestra el badge de categoría en el listado.
//   3. El formulario de edición tiene el selector de categoría.
//   4. Con una calificación final de prueba, /organizer muestra el bloque
//      "Ganador por categoría" con el ganador de cada una.
// Al final limpia la calificación de prueba y devuelve el modo a preselección.
// Uso: npx tsx --env-file=.env scripts/verify-categorias.ts [base]

import { SignJWT } from 'jose';
import {
  getDoc,
  listDocs,
  setDoc,
  updateNestedField,
  updateDoc,
} from '../src/lib/firestore-rest';

const BASE = process.argv[2] ?? 'http://localhost:9002';

async function signSession(user: any): Promise<string> {
  const key = new TextEncoder().encode(process.env.SESSION_SECRET!);
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
}

async function fetchPage(path: string, jwt: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie: `session=${jwt}` },
    redirect: 'manual',
  });
  if (res.status !== 200) {
    throw new Error(`GET ${path} → ${res.status} (esperaba 200)`);
  }
  return res.text();
}

function check(name: string, ok: boolean) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const admin = await getDoc<any>('users/admin1');
  const organizer = await getDoc<any>('users/organizer1');
  if (!admin || !organizer) throw new Error('Faltan admin1/organizer1');
  const adminJwt = await signSession(admin);
  const organizerJwt = await signSession(organizer);

  // 1. Editor de categorías
  const catPage = await fetchPage('/admin/categorias', adminJwt);
  check(
    '/admin/categorias muestra el editor',
    catPage.includes('Categorías de competencia')
  );
  check(
    'aparecen las 4 categorías',
    ['Categoría 1', 'Categoría 2', 'Categoría 3', 'Categoría 4'].every((t) =>
      catPage.includes(t)
    )
  );

  // 2. Listado con badge de categoría
  const listPage = await fetchPage('/admin/iniciativas', adminJwt);
  check(
    'listado muestra badges de categoría',
    listPage.includes('Categoría 1') && listPage.includes('Categoría 2')
  );

  // 3. Selector en el formulario de edición
  const ideas = await listDocs<any>('ideas');
  const editPage = await fetchPage(
    `/admin/iniciativas/${ideas[0].id}/edit`,
    adminJwt
  );
  check(
    'formulario de edición tiene selector de categoría',
    editPage.includes('En la evaluación final se premia 1 ganador por categoría.')
  );

  // 4. Dashboard del jurado agrupado por categorías (con descripción)
  const jurorJwt = await signSession({
    id: 'juror-verificacion',
    name: 'Jurado Verificación',
    email: 'verify@comfama.com.co',
    role: 'Jurado',
    avatarUrl: '',
  });
  const dashboard = await fetchPage('/dashboard', jurorJwt);
  check(
    'dashboard del jurado agrupa por categoría',
    dashboard.includes('Categoría 1') && dashboard.includes('Categoría 2')
  );
  check(
    'los encabezados muestran la descripción de la categoría',
    dashboard.includes('Edita el título y la descripción de esta categoría')
  );
  check(
    'las iniciativas aparecen bajo su categoría',
    dashboard.includes('Contigo+') && dashboard.includes('Nébula')
  );

  // 5. Ganador por categoría en /organizer (modo final + rating de prueba)
  const originalMode = await getDoc<any>('config/appMode');
  const demoRating = {
    scores: { originality: 5, scalability: 4, impact: 5, demo: 4, clarity: 5 },
    observations: '',
    updatedAt: new Date().toISOString(),
  };
  try {
    await setDoc('config/appMode', { mode: 'final' });
    for (const idea of ideas) {
      await updateNestedField(
        `ideas/${idea.id}`,
        'finalRatings.verificacion',
        demoRating
      );
    }
    const organizerPage = await fetchPage('/organizer', organizerJwt);
    check(
      '/organizer muestra "Ganador por categoría"',
      organizerPage.includes('Ganador por categoría')
    );
    check(
      'las 2 iniciativas aparecen como ganadoras de su categoría',
      organizerPage.includes('Contigo+') && organizerPage.includes('Nébula')
    );
    check(
      'categorías sin iniciativas muestran estado vacío',
      organizerPage.includes('Sin iniciativas calificadas en esta categoría')
    );
  } finally {
    // Limpieza: quitar rating de prueba y restaurar el modo original.
    for (const idea of ideas) {
      await updateDoc(`ideas/${idea.id}`, { finalRatings: {} }, [
        'finalRatings',
      ]);
    }
    await setDoc('config/appMode', originalMode ?? { mode: 'preseleccion' });
    console.log('· limpieza: ratings de prueba borrados y modo restaurado');
  }

  console.log(process.exitCode ? '\nHay verificaciones fallidas' : '\nTodo OK');
  process.exit(process.exitCode ?? 0);
}

main().catch((err) => {
  console.error('Verificación falló:', err);
  process.exit(1);
});
