// Borra TODOS los documentos de publicVotes (votos del público), en lotes
// de 400 como hace deleteAllPublicVotes en src/lib/data.ts.
// Uso: npx tsx --env-file=.env scripts/delete-public-votes.ts

import { listDocs, commitBatch } from '../src/lib/firestore-rest';

async function main() {
  const votes = await listDocs<{ id: string }>('publicVotes');
  console.log(`Votos encontrados: ${votes.length}`);
  for (let i = 0; i < votes.length; i += 400) {
    const chunk = votes.slice(i, i + 400);
    await commitBatch(
      chunk.map((v) => ({ type: 'delete' as const, path: `publicVotes/${v.id}` }))
    );
    console.log(`Borrados ${Math.min(i + 400, votes.length)}/${votes.length}`);
  }
  const remaining = await listDocs<{ id: string }>('publicVotes');
  console.log(`Votos restantes: ${remaining.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
