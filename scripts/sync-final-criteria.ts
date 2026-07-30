// Sincroniza la colección finalCriteria de Firestore con la semilla de
// src/lib/final-criteria.ts. Necesario cuando cambia la definición de los
// criterios en código, porque el bootstrap solo siembra si la colección
// está vacía. ADVERTENCIA: sobrescribe ediciones hechas desde el admin.
//
// Uso: npx tsx --env-file=.env scripts/sync-final-criteria.ts

import { setDoc, listDocs, deleteDoc } from '../src/lib/firestore-rest';
import { DEFAULT_FINAL_CRITERIA } from '../src/lib/final-criteria';

async function main() {
  const existing = await listDocs<any>('finalCriteria');
  console.log(
    'Criterios actuales en Firestore:',
    existing.map((c) => `${c.key}(${c.weight}%)`).join(', ') || '(vacío)'
  );

  const seedKeys = new Set(DEFAULT_FINAL_CRITERIA.map((c) => c.key));
  for (const doc of existing) {
    if (!seedKeys.has(doc.key)) {
      console.log(`Borrando criterio obsoleto: ${doc.key}`);
      await deleteDoc(`finalCriteria/${doc.id ?? doc.key}`);
    }
  }

  for (const c of DEFAULT_FINAL_CRITERIA) {
    console.log(`Escribiendo ${c.key} (${c.weight}%): ${c.label}`);
    await setDoc(`finalCriteria/${c.key}`, c as unknown as Record<string, any>);
  }

  const after = await listDocs<any>('finalCriteria');
  console.log(
    '\nCriterios finales en Firestore:',
    after.map((c) => `${c.key}(${c.weight}%)`).join(', ')
  );
  const total = after.reduce((s, c) => s + (c.weight ?? 0), 0);
  console.log('Suma de pesos:', total);
  if (total !== 100) {
    console.error('¡Los pesos no suman 100!');
    process.exit(1);
  }
  console.log('Sincronización completa.');
}

main().catch((e) => {
  console.error('Error:', e?.message ?? e);
  process.exit(1);
});
