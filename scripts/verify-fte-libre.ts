// Verifica que "Impacto en eficiencia" ya muestra texto libre (sin el
// formato "aprox N horas mensuales"). 1 lectura (jurado) + 1 carga de
// dashboard (~23 lecturas).
// Uso: npx tsx --env-file=.env scripts/verify-fte-libre.ts

import { SignJWT } from 'jose';
import { runQuery, fieldEquals } from '../src/lib/firestore-rest';

const BASE = 'http://localhost:9002';

async function main() {
  const jurors = await runQuery<any>({
    from: [{ collectionId: 'users' }],
    where: fieldEquals('role', 'Jurado'),
    limit: 1,
  });
  const key = new TextEncoder().encode(process.env.SESSION_SECRET!);
  const jwt = await new SignJWT({ user: jurors[0] })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);

  const html = (
    await (
      await fetch(`${BASE}/dashboard`, { headers: { cookie: `session=${jwt}` } })
    ).text()
  ).replace(/<!--\s*-->/g, '');

  const aproxCount = (html.match(/aprox \d+ horas mensuales/g) ?? []).length;
  console.log('Dashboard cargado. Formato viejo "aprox N horas mensuales":', aproxCount === 0 ? 'eliminado OK' : `AÚN APARECE ${aproxCount} veces`);
  console.log('Texto "horas" presente (valores libres de los equipos):', /hora/i.test(html) ? 'sí' : 'no');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
