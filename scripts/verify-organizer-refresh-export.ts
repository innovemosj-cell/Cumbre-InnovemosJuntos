// Verifica en local los dos endpoints del panel del organizador:
//  1. GET /api/final-results  -> snapshot mínimo (solo finalRatings)
//  2. GET /api/export-evaluaciones -> XLSX de la evaluación final
// Lecturas directas de este script: 1 (runQuery users limit 1). El resto las
// hace el servidor local.
// Uso: npx tsx --env-file=.env scripts/verify-organizer-refresh-export.ts [base]

import { SignJWT } from 'jose';
import * as XLSX from 'xlsx';
import { runQuery, fieldEquals } from '../src/lib/firestore-rest';

const BASE = process.argv[2] ?? 'http://localhost:3000';

async function main() {
  const organizers = await runQuery<any>({
    from: [{ collectionId: 'users' }],
    where: fieldEquals('role', 'Organizer'),
    limit: 1,
  });
  const organizer = organizers[0];
  if (!organizer) throw new Error('No hay usuario Organizer');

  const key = new TextEncoder().encode(process.env.SESSION_SECRET!);
  const jwt = await new SignJWT({ user: organizer })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
  const headers = { cookie: `session=${jwt}` };

  // --- 1. Snapshot mínimo ---
  const res1 = await fetch(`${BASE}/api/final-results`, { headers });
  console.log(`GET /api/final-results -> ${res1.status}`);
  if (!res1.ok) throw new Error(await res1.text());
  const snap = (await res1.json()) as {
    ideas: { id: string; finalRatings: Record<string, any> }[];
  };
  const withVotes = snap.ideas.filter(
    (i) => Object.keys(i.finalRatings).length > 0
  );
  console.log(
    `  ideas: ${snap.ideas.length}, con votos finales: ${withVotes.length}`
  );
  for (const i of withVotes.slice(0, 3)) {
    const jurors = Object.keys(i.finalRatings);
    const sample = i.finalRatings[jurors[0]];
    console.log(
      `  - ${i.id}: ${jurors.length} jurado(s), scores ejemplo:`,
      JSON.stringify(sample?.scores)
    );
  }
  // La proyección no debe traer otros campos del doc.
  const leaked = snap.ideas.find((i: any) => (i as any).name || (i as any).ratings);
  console.log(`  proyección limpia (sin name/ratings): ${leaked ? 'NO ⚠️' : 'sí'}`);

  // --- 2. Export XLSX ---
  const res2 = await fetch(`${BASE}/api/export-evaluaciones`, { headers });
  const cd = res2.headers.get('content-disposition') ?? '';
  console.log(`\nGET /api/export-evaluaciones -> ${res2.status}  (${cd})`);
  if (!res2.ok) throw new Error(await res2.text());
  const buf = await res2.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  console.log(`  hojas: ${wb.SheetNames.join(', ')}`);
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], {
      header: 1,
    }) as any[][];
    console.log(`\n  [${name}] ${rows.length - 1} filas. Encabezados:`);
    console.log(`    ${(rows[0] ?? []).join(' | ')}`);
    for (const r of rows.slice(1, 4)) {
      console.log(`    ${r.join(' | ')}`);
    }
  }
}

main().catch((e: any) => {
  console.error(e);
  process.exit(1);
});
