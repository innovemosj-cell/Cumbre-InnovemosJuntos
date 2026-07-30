// Verifica los ajustes de numeración y foto: dashboard con "Iniciativa N"
// (sin badge #codigo) y detalle con "Iniciativa N de M" + foto object-top.
// Uso: npx tsx --env-file=.env scripts/verify-numeracion.ts

import { SignJWT } from 'jose';
import { runQuery, fieldEquals, listDocs } from '../src/lib/firestore-rest';

const BASE = 'http://localhost:9002';

async function main() {
  const jurors = await runQuery<any>({
    from: [{ collectionId: 'users' }],
    where: fieldEquals('role', 'Jurado'),
    limit: 1,
  });
  const juror = jurors[0];
  if (!juror) throw new Error('No hay jurados');

  const ideas = await listDocs<any>('ideas');
  const active = ideas
    .filter((i: any) => i.active !== false)
    .sort((a: any, b: any) => (a.order ?? Infinity) - (b.order ?? Infinity));
  console.log(`Ideas activas: ${active.length}`);

  const key = new TextEncoder().encode(process.env.SESSION_SECRET!);
  const jwt = await new SignJWT({ user: juror })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
  const headers = { cookie: `session=${jwt}` };

  // React SSR intercala comentarios <!-- --> entre textos interpolados
  // ("Iniciativa <!-- -->3"): se limpian antes de comparar.
  const clean = (html: string) => html.replace(/<!--\s*-->/g, '');

  const dash = clean(
    await (await fetch(`${BASE}/dashboard`, { headers })).text()
  );
  console.log('--- Dashboard ---');
  console.log('Iniciativa 1:', dash.includes('Iniciativa 1') ? 'OK' : 'FALTA');
  console.log(
    `Iniciativa ${active.length}:`,
    dash.includes(`Iniciativa ${active.length}`) ? 'OK' : 'FALTA'
  );
  const codigos = active.map((i: any) => i.codigo).filter(Boolean);
  const badgeConCodigo = codigos.some((c: string) => dash.includes(`#${c}`));
  console.log('Badge #codigo:', badgeConCodigo ? 'AUN PRESENTE (mal)' : 'eliminado OK');

  // Detalle de la tercera iniciativa activa (debe decir "Iniciativa 3 de N")
  const target = active[2] ?? active[0];
  const pos = active.findIndex((i: any) => i.id === target.id) + 1;
  const detail = clean(
    await (await fetch(`${BASE}/ideas/${target.id}`, { headers })).text()
  );
  console.log('--- Detalle ---');
  console.log(
    `"Iniciativa ${pos} de ${active.length}":`,
    detail.includes(`Iniciativa ${pos} de ${active.length}`) ? 'OK' : 'FALTA'
  );
  console.log('object-top en foto:', detail.includes('object-top') ? 'OK' : 'FALTA');
  console.log(
    'Badge #codigo en detalle:',
    target.codigo && detail.includes(`#${target.codigo}`)
      ? 'AUN PRESENTE (mal)'
      : 'eliminado OK'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
