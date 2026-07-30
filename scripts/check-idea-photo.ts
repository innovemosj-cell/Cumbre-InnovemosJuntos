// Muestra las URLs de foto guardadas en Firestore para una iniciativa.
// Uso: npx tsx --env-file=.env scripts/check-idea-photo.ts <texto del nombre>

import { listDocs } from '../src/lib/firestore-rest';

async function main() {
  const query = (process.argv[2] ?? 'concilia').toLowerCase();
  const ideas = await listDocs<any>('ideas');
  const matches = ideas.filter((i) =>
    `${i.nombreSolucion ?? ''} ${i.name ?? ''}`.toLowerCase().includes(query)
  );
  if (matches.length === 0) {
    console.log(`No se encontró ninguna iniciativa con "${query}".`);
    return;
  }
  for (const i of matches) {
    console.log('id:          ', i.id);
    console.log('nombre:      ', i.nombreSolucion || i.name);
    console.log('activa:      ', i.active !== false);
    console.log('imageUrl:    ', i.imageUrl || '(vacía)');
    console.log('imageUrl_2:  ', i.imageUrl_2 || '(vacía)');
    console.log('---');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
