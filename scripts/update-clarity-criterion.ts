// Actualiza SOLO el criterio "clarity" en Firestore con el texto nuevo de la
// semilla (reenfocado a claridad de la comunicación, sin "originalidad").
// Costo: 1 escritura, 0 lecturas.
// Uso: npx tsx --env-file=.env scripts/update-clarity-criterion.ts

import { setDoc } from '../src/lib/firestore-rest';
import { DEFAULT_FINAL_CRITERIA } from '../src/lib/final-criteria';

async function main() {
  const clarity = DEFAULT_FINAL_CRITERIA.find((c) => c.key === 'clarity');
  if (!clarity) throw new Error('No existe el criterio clarity en la semilla');
  await setDoc('finalCriteria/clarity', clarity as unknown as Record<string, any>);
  console.log('Criterio actualizado:', clarity.label);
  console.log('Pregunta:', clarity.question);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
