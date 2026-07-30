// Prueba end-to-end del guardado de la evaluación final contra Firestore.
// Verifica que updateNestedField cree el mapa finalRatings cuando el doc
// no lo tiene (caso real: ideas existentes sin ese campo), y que el modo
// y los criterios finales se lean bien. Usa un doc de prueba y lo borra.
//
// Uso: npx tsx --env-file=.env scripts/test-final-rating.ts

import {
  setDoc,
  getDoc,
  deleteDoc,
  updateNestedField,
  listDocs,
} from '../src/lib/firestore-rest';

const TEST_PATH = 'smoke-tests/final-rating-smoke';

async function main() {
  console.log('1. Creando doc de prueba SIN campo finalRatings...');
  await setDoc(TEST_PATH, { id: 'final-rating-smoke', name: 'Prueba', ratings: {} });

  console.log('2. Guardando calificación anidada finalRatings.juror-x ...');
  await updateNestedField(TEST_PATH, 'finalRatings.juror-x', {
    scores: { originality: 5, scalability: 4, impact: 3, clarity: 2 },
    observations: 'obs de prueba',
    updatedAt: new Date().toISOString(),
  });

  console.log('3. Guardando una segunda calificación de otro jurado...');
  await updateNestedField(TEST_PATH, 'finalRatings.juror-y', {
    scores: { originality: 1, scalability: 1, impact: 1, clarity: 1 },
    observations: '',
    updatedAt: new Date().toISOString(),
  });

  console.log('4. Leyendo el doc de vuelta...');
  const doc = await getDoc<any>(TEST_PATH);
  const fr = doc?.finalRatings ?? {};
  const jx = fr['juror-x'];
  const jy = fr['juror-y'];

  const checks: [string, boolean][] = [
    ['finalRatings existe como mapa', typeof fr === 'object' && fr !== null],
    ['conserva ratings de preselección', typeof doc?.ratings === 'object'],
    ['voto juror-x guardado', !!jx],
    ['scores.originality === 5', jx?.scores?.originality === 5],
    ['scores.clarity === 2', jx?.scores?.clarity === 2],
    ['observations guardadas', jx?.observations === 'obs de prueba'],
    ['segundo jurado no pisó al primero', !!jx && !!jy],
    ['scores juror-y === 1', jy?.scores?.impact === 1],
  ];

  console.log('5. Sobrescribiendo el voto de juror-x (editar calificación)...');
  await updateNestedField(TEST_PATH, 'finalRatings.juror-x', {
    scores: { originality: 2, scalability: 2, impact: 2, clarity: 2 },
    observations: 'editada',
    updatedAt: new Date().toISOString(),
  });
  const doc2 = await getDoc<any>(TEST_PATH);
  checks.push([
    'edición del voto funciona',
    doc2?.finalRatings?.['juror-x']?.scores?.originality === 2 &&
      doc2?.finalRatings?.['juror-x']?.observations === 'editada',
  ]);
  checks.push([
    'edición no borra al otro jurado',
    doc2?.finalRatings?.['juror-y']?.scores?.impact === 1,
  ]);

  console.log('6. Leyendo config/appMode y finalCriteria...');
  const appMode = await getDoc<any>('config/appMode');
  console.log('   appMode:', JSON.stringify(appMode));
  const finalCriteria = await listDocs<any>('finalCriteria');
  console.log(
    '   finalCriteria docs:',
    finalCriteria.map((c) => `${c.key}(${c.weight}%)`).join(', ') || '(vacío, usará defaults)'
  );

  console.log('7. Borrando doc de prueba...');
  await deleteDoc(TEST_PATH);

  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(`   ${ok ? 'OK ' : 'FALLA'} - ${name}`);
    if (!ok) failed++;
  }
  if (failed > 0) {
    console.error(`\n${failed} verificaciones fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones pasaron.');
}

main().catch((e) => {
  console.error('Error en la prueba:', e?.message ?? e);
  process.exit(1);
});
