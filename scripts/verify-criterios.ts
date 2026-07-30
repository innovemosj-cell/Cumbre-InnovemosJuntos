// Verifica el estado de Firestore tras la migración: lista criterios por
// frente, valida que los pesos sumen 100%, y muestra un sample de cómo
// formatFTE() interpreta los `eficienciaFTE` de las ideas actuales.

import 'dotenv/config';
import { listDocs } from '../src/lib/firestore-rest';
import { formatFTE } from '../src/lib/utils';
import type { Criterion, FrenteKey, Idea } from '../src/lib/types';

const FRENTE_ORDER: FrenteKey[] = ['estrategia', 'impacto', 'innovacion', 'tecnico'];

function pad(s: string, n: number) {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

async function main() {
  const criteria = await listDocs<Criterion>('criteria');
  const ideas = await listDocs<Idea>('ideas');

  console.log(`\n=== CRITERIOS EN FIRESTORE (${criteria.length}) ===\n`);

  let anyError = false;
  for (const frente of FRENTE_ORDER) {
    const items = criteria
      .filter((c) => c.frente === frente)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const sumWeight = items.reduce((acc, c) => acc + (c.weight ?? 0), 0);
    const ok = sumWeight === 100;
    if (!ok) anyError = true;

    console.log(
      `[${frente.toUpperCase()}]  pesos suman ${sumWeight}%  ${ok ? 'OK' : 'FAIL'}`
    );
    for (const c of items) {
      const info = c.infoHelp ? `  (infoHelp: ${c.infoHelp.items?.length ?? 0} items)` : '';
      console.log(
        `  - ${pad(c.id, 32)}  peso=${pad(String(c.weight) + '%', 5)}  niveles=${c.levels?.length ?? 0}  order=${c.order}${info}`
      );
    }
    console.log('');
  }

  // Criterios huérfanos (no pertenecen a ningún frente conocido).
  const orphans = criteria.filter((c) => !FRENTE_ORDER.includes(c.frente as FrenteKey));
  if (orphans.length > 0) {
    anyError = true;
    console.log(`HUÉRFANOS (frente desconocido):`);
    for (const o of orphans) console.log(`  - ${o.id} (frente="${o.frente}")`);
    console.log('');
  }

  console.log(`=== IDEAS (${ideas.length}) - sample formatFTE ===\n`);
  const sample = ideas.slice(0, 8);
  for (const idea of sample) {
    const original = (idea.eficienciaFTE ?? '').slice(0, 60);
    const formatted = formatFTE(idea.eficienciaFTE) || '(vacío)';
    console.log(`  ${pad(idea.id, 8)}  in="${original}"`);
    console.log(`            out="${formatted}"`);
  }

  // Detectar ratings con scores huérfanos.
  console.log(`\n=== RATINGS - chequeo de scores huérfanos ===\n`);
  const validIds = new Set(criteria.map((c) => c.id));
  let orphanScores = 0;
  for (const idea of ideas) {
    for (const [jurorId, rating] of Object.entries(idea.ratings ?? {})) {
      for (const scoreId of Object.keys(rating.scores ?? {})) {
        if (!validIds.has(scoreId)) {
          orphanScores++;
          console.log(`  - ideas/${idea.id} jurorId=${jurorId} score huérfano="${scoreId}"`);
        }
      }
    }
  }
  if (orphanScores === 0) {
    console.log('  (ninguno)');
  } else {
    anyError = true;
  }

  console.log(`\n=== RESULTADO: ${anyError ? 'HAY ERRORES' : 'TODO OK'} ===\n`);
  if (anyError) process.exit(1);
}

main().catch((err) => {
  console.error('Verificación falló:', err);
  process.exit(1);
});
