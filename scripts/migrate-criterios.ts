// Migración de criterios para la nueva estructura de frentes.
//
// Cambios:
// - Renombra "deseabilidad" -> "valor" (4 niveles nuevos).
// - Reemplaza "escalabilidad-reutilizacion" por "novedad" (4 niveles).
// - Elimina "transformacion-modelo-operativo".
// - Mueve "tendencia-futuro" del frente estrategia -> innovacion.
// - Rebalancea pesos de Estrategia (60/40) e Innovación (60/40).
// - Migra scores en cada idea: scores.deseabilidad -> scores.valor;
//   borra scores de criterios eliminados.
//
// Uso:
//   npx tsx scripts/migrate-criterios.ts          (dry-run)
//   npx tsx scripts/migrate-criterios.ts --apply  (escribe a Firestore)

import 'dotenv/config';
import { deleteDoc, listDocs, setDoc, updateDoc } from '../src/lib/firestore-rest';
import { CRITERIA } from '../src/lib/criteria-data';
import type { Idea, Rating } from '../src/lib/types';

const APPLY = process.argv.includes('--apply');

const TO_DELETE = [
  'deseabilidad',
  'escalabilidad-reutilizacion',
  'transformacion-modelo-operativo',
];

const NEW_IDS = new Set(CRITERIA.map((c) => c.id));

async function migrateCriteriaCollection() {
  console.log('\n[1/2] Migrando colección criteria...');
  const existing = await listDocs<any>('criteria');
  console.log(`  - Encontrados ${existing.length} criterios en Firestore.`);

  // 1a. Borrar criterios obsoletos.
  for (const id of TO_DELETE) {
    const exists = existing.find((c) => c.id === id);
    if (!exists) {
      console.log(`  - skip delete (no existe): criteria/${id}`);
      continue;
    }
    console.log(`  - DELETE criteria/${id}`);
    if (APPLY) await deleteDoc(`criteria/${id}`);
  }

  // 1b. Borrar criterios que ya no estén en CRITERIA (limpieza).
  for (const c of existing) {
    if (TO_DELETE.includes(c.id)) continue;
    if (!NEW_IDS.has(c.id)) {
      console.log(`  - DELETE huérfano criteria/${c.id}`);
      if (APPLY) await deleteDoc(`criteria/${c.id}`);
    }
  }

  // 1c. Upsert (setDoc) de cada criterio nuevo/actualizado.
  for (const c of CRITERIA) {
    console.log(`  - SET criteria/${c.id} (frente=${c.frente}, peso=${c.weight}, order=${c.order})`);
    if (APPLY) {
      // setDoc usa PATCH sin updateMask -> reemplaza todo el documento con los campos enviados.
      await setDoc(`criteria/${c.id}`, c as unknown as Record<string, any>);
    }
  }
}

async function migrateIdeasRatings() {
  console.log('\n[2/2] Migrando ratings en ideas...');
  const ideas = await listDocs<Idea>('ideas');
  console.log(`  - Encontradas ${ideas.length} ideas.`);

  let touched = 0;
  for (const idea of ideas) {
    const ratings = idea.ratings ?? {};
    let changed = false;
    const newRatings: Record<string, Rating> = {};

    for (const [jurorId, rating] of Object.entries(ratings)) {
      const scores = { ...(rating.scores ?? {}) };

      // deseabilidad -> valor
      if (scores['deseabilidad'] !== undefined) {
        if (scores['valor'] === undefined) {
          scores['valor'] = scores['deseabilidad'];
        }
        delete scores['deseabilidad'];
        changed = true;
      }

      // borrar criterios eliminados
      for (const id of ['escalabilidad-reutilizacion', 'transformacion-modelo-operativo']) {
        if (scores[id] !== undefined) {
          delete scores[id];
          changed = true;
        }
      }

      newRatings[jurorId] = { ...rating, scores };
    }

    if (changed) {
      touched++;
      console.log(`  - UPDATE ideas/${idea.id}.ratings (jurados=${Object.keys(newRatings).length})`);
      if (APPLY) {
        await updateDoc(`ideas/${idea.id}`, { ratings: newRatings }, ['ratings']);
      }
    }
  }
  console.log(`  - Ideas actualizadas: ${touched}`);
}

async function main() {
  console.log(`\n=== Migración de criterios (mode=${APPLY ? 'APPLY' : 'DRY-RUN'}) ===`);
  await migrateCriteriaCollection();
  await migrateIdeasRatings();
  console.log('\n=== Listo ===');
  if (!APPLY) {
    console.log('Esto fue una corrida en seco. Ejecuta con --apply para escribir a Firestore.');
  }
}

main().catch((err) => {
  console.error('Migración falló:', err);
  process.exit(1);
});
