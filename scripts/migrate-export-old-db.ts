// PASO 1 de la migración: exporta desde la BD VIEJA (clasificacion-hackathon)
// la estructura que se va a replicar en la nueva:
//   - criteria (criterios de preselección)
//   - finalCriteria (criterios de la evaluación final)
//   - config: appMode, publicVoting, ratingWeights
//   - 2 iniciativas de muestra (sin ratings ni finalRatings)
// Escribe todo a scripts/migration-dump.json (gitignoreado no, pero temporal).
//
// Usa FIREBASE_SERVICE_ACCOUNT_OLD del .env: se asigna a
// FIREBASE_SERVICE_ACCOUNT ANTES de importar firestore-rest, que cachea la
// credencial al primer uso.
//
// Uso: npx tsx --env-file=.env scripts/migrate-export-old-db.ts

import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const oldSa = process.env.FIREBASE_SERVICE_ACCOUNT_OLD;
  if (!oldSa) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_OLD no está en el .env');
  }
  process.env.FIREBASE_SERVICE_ACCOUNT = oldSa;
  const { listDocs, getDoc } = await import('../src/lib/firestore-rest');

  console.log('Leyendo BD vieja (clasificacion-hackathon)...');

  const [criteria, finalCriteria, appMode, publicVoting, ratingWeights, ideas] =
    await Promise.all([
      listDocs<any>('criteria'),
      listDocs<any>('finalCriteria'),
      getDoc<any>('config/appMode'),
      getDoc<any>('config/publicVoting'),
      getDoc<any>('config/ratingWeights'),
      listDocs<any>('ideas'),
    ]);

  // 2 iniciativas de muestra: las primeras activas por orden, sin resultados.
  const sampleIdeas = ideas
    .filter((i) => i.active !== false)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .slice(0, 2)
    .map(({ ratings, finalRatings, audioUrl, audioGeneratedAt, ...rest }) => ({
      ...rest,
      ratings: {},
    }));

  const dump = {
    exportedAt: new Date().toISOString(),
    criteria,
    finalCriteria,
    config: {
      // Estado inicial limpio: modo preselección y votación pública cerrada.
      appMode: { mode: 'preseleccion' },
      publicVoting: { open: false },
      ratingWeights: ratingWeights ?? null,
      // Referencia de lo que había en la BD vieja (no se importa):
      _oldAppMode: appMode,
      _oldPublicVoting: publicVoting,
    },
    ideas: sampleIdeas,
  };

  const outPath = path.join(__dirname, 'migration-dump.json');
  fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8');

  console.log(`  - criteria:      ${criteria.length}`);
  console.log(`  - finalCriteria: ${finalCriteria.length}`);
  console.log(`  - ratingWeights: ${ratingWeights ? 'sí' : 'no encontrado'}`);
  console.log(`  - iniciativas de muestra: ${sampleIdeas.map((i) => `${i.codigo} (${i.name})`).join(' | ')}`);
  console.log(`\nDump escrito en ${outPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Export falló:', err);
  process.exit(1);
});
