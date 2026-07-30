// Cuenta documentos por colección para dimensionar el costo en lecturas
// de Firestore de cada página. Uso: npx tsx --env-file=.env scripts/count-collections.ts

import { listDocs } from '../src/lib/firestore-rest';

async function main() {
  const collections = [
    'ideas',
    'users',
    'criteria',
    'finalCriteria',
    'publicVotes',
  ];
  for (const col of collections) {
    const docs = await listDocs<any>(col);
    console.log(`${col}: ${docs.length} docs`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
