// Verifica que TODAS las vistas de iniciativas estén divididas por categoría:
//   1. /admin/iniciativas (admin): filas agrupadas bajo encabezados de categoría.
//   2. /my-results (jurado, preselección): pendientes agrupadas por categoría.
//   3. /my-results (jurado, final): calificadas agrupadas por categoría
//      (con una calificación final de prueba que se limpia al final).
//   4. /organizer (preselección): "Ranking por categoría".
// Uso: npx tsx --env-file=.env scripts/verify-agrupacion.ts [base]

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
  // Sin guiones: el id se usa como field path de Firestore (finalRatings.<id>).
  const juror = {
    id: 'verificacion',
    name: 'Jurado Verificación',
    email: 'verify@comfama.com.co',
    role: 'Jurado',
    avatarUrl: '',
    frentesAEvaluar: ['estrategia', 'impacto', 'innovacion', 'tecnico'],
  };
  const jurorJwt = await signSession(juror);
  const ideas = await listDocs<any>('ideas');

  // 1. Admin: listado de iniciativas agrupado
  const adminList = await fetchPage('/admin/iniciativas', adminJwt);
  check(
    '/admin/iniciativas agrupa por categoría (encabezados)',
    adminList.includes('Categoría 1') && adminList.includes('Categoría 2')
  );
  check(
    'encabezados del admin muestran la descripción',
    adminList.includes('Edita el título y la descripción de esta categoría')
  );
  check(
    'hint de reordenar menciona la categoría',
    adminList.includes('dentro de su categoría')
  );

  const demoRating = {
    scores: { originality: 5, scalability: 4, impact: 5, demo: 4, clarity: 5 },
    observations: '',
    updatedAt: new Date().toISOString(),
  };
  try {
    // 2. Preselección: Mis Calificaciones (pendientes) y organizer
    await setDoc('config/appMode', { mode: 'preseleccion' });

    const myResultsPre = await fetchPage('/my-results', jurorJwt);
    check(
      '/my-results (preselección) agrupa pendientes por categoría',
      myResultsPre.includes('Categoría 1') &&
        myResultsPre.includes('Categoría 2')
    );
    check(
      '/my-results (preselección) menciona división por categoría',
      myResultsPre.includes('divididos por categoría')
    );

    const organizerPre = await fetchPage('/organizer', organizerJwt);
    check(
      '/organizer (preselección) muestra "Ranking por categoría"',
      organizerPre.includes('Ranking por categoría')
    );
    check(
      '/organizer (preselección) agrupa con encabezados de categoría',
      organizerPre.includes('Categoría 1') && organizerPre.includes('Categoría 2')
    );

    // Mis Calificaciones en modo final con calificaciones de prueba
    await setDoc('config/appMode', { mode: 'final' });
    for (const idea of ideas) {
      await updateNestedField(
        `ideas/${idea.id}`,
        `finalRatings.${juror.id}`,
        demoRating
      );
    }
    const myResultsFinal = await fetchPage('/my-results', jurorJwt);
    check(
      '/my-results (final) agrupa calificadas por categoría',
      myResultsFinal.includes('Categoría 1') &&
        myResultsFinal.includes('Categoría 2')
    );
    check(
      '/my-results (final) muestra las iniciativas bajo su categoría',
      myResultsFinal.includes('Contigo+') && myResultsFinal.includes('Nébula')
    );
  } finally {
    for (const idea of ideas) {
      await updateDoc(`ideas/${idea.id}`, { finalRatings: {} }, [
        'finalRatings',
      ]);
    }
    // El evento está en preselección: siempre se restaura ese modo.
    await setDoc('config/appMode', { mode: 'preseleccion' });
    console.log('· limpieza: ratings de prueba borrados y modo en preseleccion');
  }

  console.log(process.exitCode ? '\nHay verificaciones fallidas' : '\nTodo OK');
  process.exit(process.exitCode ?? 0);
}

main().catch((err) => {
  console.error('Verificación falló:', err);
  process.exit(1);
});
