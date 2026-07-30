// Siembra las 4 categorías de competencia (si no existen) y asigna una
// categoría a las iniciativas que aún no tengan, repartiéndolas en orden.
// La app también auto-siembra las categorías al primer uso; este script es
// para dejar la BD lista sin tener que abrir la app.
//
// Uso: npx tsx --env-file=.env scripts/seed-categories.ts

import { listDocs, setDoc, updateDoc } from '../src/lib/firestore-rest';

const DEFAULT_CATEGORIES = [
  { id: 'categoria-1', title: 'Categoría 1', order: 1 },
  { id: 'categoria-2', title: 'Categoría 2', order: 2 },
  { id: 'categoria-3', title: 'Categoría 3', order: 3 },
  { id: 'categoria-4', title: 'Categoría 4', order: 4 },
].map((c) => ({
  ...c,
  description:
    'Edita el título y la descripción de esta categoría desde Admin → Categorías.',
}));

async function main() {
  const existing = await listDocs<any>('categories');
  if (existing.length === 0) {
    for (const c of DEFAULT_CATEGORIES) {
      await setDoc(`categories/${c.id}`, c);
    }
    console.log(`+ ${DEFAULT_CATEGORIES.length} categorías creadas`);
  } else {
    console.log(`= ya existen ${existing.length} categorías, no se tocan`);
  }

  const categories = existing.length > 0 ? existing : DEFAULT_CATEGORIES;
  const ideas = await listDocs<any>('ideas');
  let assigned = 0;
  for (const [i, idea] of ideas.entries()) {
    if (!idea.categoryId) {
      const cat = categories[i % categories.length];
      await updateDoc(`ideas/${idea.id}`, { categoryId: cat.id });
      console.log(`+ ${idea.codigo} (${idea.name}) → ${cat.title}`);
      assigned++;
    }
  }
  if (assigned === 0) console.log('= todas las iniciativas ya tienen categoría');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed de categorías falló:', err);
  process.exit(1);
});
