// Crea los jurados de la evaluación final con código de acceso aleatorio de
// 4 dígitos, replicando la estructura de createUserAction.
// Lecturas: 1 listado de users (para unicidad de códigos y correos).
// Escrituras: 1 por jurado nuevo. Si el correo ya existe, se omite.
// Uso: npx tsx --env-file=.env scripts/create-final-jurors.ts

import { randomInt } from 'crypto';
import { listDocs, setDoc, newDocId } from '../src/lib/firestore-rest';

const JURORS = [
  { name: 'Perla Toro', email: 'perlatoro@comfama.com.co', rolOrganizacion: 'RESPONSABLE COMUNICACIONES' },
  { name: 'Patricia Vahos', email: 'patriciavahos@comfama.com.co', rolOrganizacion: 'RESPONSABLE TALENTO HUMANO' },
  { name: 'Angela Gonzalez', email: 'angelagonzalez@comfama.com.co', rolOrganizacion: 'RESPONSABLE TECNOLOGIA Y DATOS' },
  { name: 'Mauricio Perez', email: 'mauricioperez@comfama.com.co', rolOrganizacion: 'RESPONSABLE ESTRATEGIA Y PROYECTOS' },
  { name: 'Nicolas Correa', email: 'nicolascorrea@comfama.com.co', rolOrganizacion: 'RESPONSABLE SERVICIOS ORGANIZACIONALES' },
  { name: 'Santiago Jiménez Londoño', email: 'sjimene8@eafit.edu.co', rolOrganizacion: 'PROFESOR UNIVERSIDAD EAFIT' },
];

async function main() {
  const existing = await listDocs<any>('users');
  const usedCodes = new Set(
    existing.map((u) => String(u.loginCode ?? '')).filter(Boolean)
  );
  const usedEmails = new Set(
    existing.map((u) => String(u.email ?? '').toLowerCase())
  );

  const newCode = () => {
    for (let i = 0; i < 1000; i++) {
      const code = String(randomInt(0, 10000)).padStart(4, '0');
      if (!usedCodes.has(code)) {
        usedCodes.add(code);
        return code;
      }
    }
    throw new Error('No se encontró código libre');
  };

  const created: { name: string; email: string; code: string }[] = [];
  for (const j of JURORS) {
    if (usedEmails.has(j.email.toLowerCase())) {
      console.log(`OMITIDO (correo ya existe): ${j.name} <${j.email}>`);
      continue;
    }
    const id = newDocId();
    const loginCode = newCode();
    await setDoc(`users/${id}`, {
      id,
      name: j.name,
      email: j.email,
      role: 'Jurado',
      avatarUrl: `https://picsum.photos/seed/${id}/40/40`,
      loginCode,
      frentesAEvaluar: [],
      rolOrganizacion: j.rolOrganizacion,
    });
    created.push({ name: j.name, email: j.email, code: loginCode });
    console.log(`CREADO: ${j.name} — código ${loginCode}`);
  }

  console.log('\n--- Resumen (códigos de acceso) ---');
  for (const c of created) {
    console.log(`${c.code}  ${c.name}  <${c.email}>`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
