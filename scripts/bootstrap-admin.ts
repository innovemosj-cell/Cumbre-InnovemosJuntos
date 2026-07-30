// Crea los usuarios base (Admin y Organizer) en una base de datos nueva,
// sin tocar nada más. Respeta los códigos existentes si ya fueron creados.
// Uso: npx tsx --env-file=.env scripts/bootstrap-admin.ts

import { getDoc, setDoc, listDocs } from '../src/lib/firestore-rest';

function generateLoginCode(used: Set<string>): string {
  let code: string;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (used.has(code));
  used.add(code);
  return code;
}

async function main() {
  const users = await listDocs<any>('users');
  const usedCodes = new Set<string>(
    users.map((u) => u.loginCode).filter(Boolean)
  );

  const base = [
    {
      id: 'admin1',
      name: 'Admin Cumbre',
      email: 'admin@comfama.com.co',
      role: 'Admin' as const,
      avatarUrl: 'https://picsum.photos/seed/admin/40/40',
    },
    {
      id: 'organizer1',
      name: 'Organizador Cumbre',
      email: 'organizer@comfama.com.co',
      role: 'Organizer' as const,
      avatarUrl: 'https://picsum.photos/seed/organizer/40/40',
    },
  ];

  for (const u of base) {
    const existing = await getDoc<any>(`users/${u.id}`);
    if (existing?.loginCode) {
      console.log(`= ${u.role.padEnd(9)} ${u.id} ya existe. loginCode: ${existing.loginCode}`);
      continue;
    }
    const loginCode = generateLoginCode(usedCodes);
    await setDoc(`users/${u.id}`, { ...u, loginCode });
    console.log(`+ ${u.role.padEnd(9)} ${u.id} creado.  loginCode: ${loginCode}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Bootstrap falló:', err);
  process.exit(1);
});
