// PASO 2 de la migración: importa a la BD NUEVA (cumbre-innovemosjuntos)
// el dump generado por migrate-export-old-db.ts. No toca la colección users
// (admin1 y organizer1 ya existen) y no importa resultados ni votos.
//
// Uso: npx tsx --env-file=.env scripts/migrate-import-new-db.ts

import * as fs from 'fs';
import * as path from 'path';
import { setDoc, commitBatch, type BatchWrite } from '../src/lib/firestore-rest';

async function main() {
  const dumpPath = path.join(__dirname, 'migration-dump.json');
  if (!fs.existsSync(dumpPath)) {
    throw new Error('No existe migration-dump.json. Corre primero migrate-export-old-db.ts');
  }
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

  console.log('Importando a BD nueva (cumbre-innovemosjuntos)...');

  const writes: BatchWrite[] = [];

  for (const c of dump.criteria) {
    writes.push({ type: 'set', path: `criteria/${c.id}`, data: c });
  }
  for (const c of dump.finalCriteria) {
    // El id del doc de finalCriteria es su key.
    writes.push({ type: 'set', path: `finalCriteria/${c.key}`, data: c });
  }
  writes.push({ type: 'set', path: 'config/appMode', data: dump.config.appMode });
  writes.push({ type: 'set', path: 'config/publicVoting', data: dump.config.publicVoting });
  if (dump.config.ratingWeights) {
    const { id, ...weights } = dump.config.ratingWeights;
    writes.push({ type: 'set', path: 'config/ratingWeights', data: weights });
  }
  for (const idea of dump.ideas) {
    writes.push({ type: 'set', path: `ideas/${idea.id}`, data: idea });
  }

  await commitBatch(writes);

  console.log(`  ✓ criteria:      ${dump.criteria.length}`);
  console.log(`  ✓ finalCriteria: ${dump.finalCriteria.length}`);
  console.log('  ✓ config: appMode=preseleccion, publicVoting=cerrada, ratingWeights');
  console.log(`  ✓ iniciativas: ${dump.ideas.map((i: any) => `${i.codigo} (${i.name})`).join(' | ')}`);
  console.log('\nListo.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Import falló:', err);
  process.exit(1);
});
