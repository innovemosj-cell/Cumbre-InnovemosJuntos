import 'dotenv/config';
import { listDocs, setDoc } from '../src/lib/firestore-rest';

// Empareja cada equipo con su iniciativa por nombre (tolerante a puntuación
// menor y guiones). Crea/actualiza 10 usuarios rol Equipo con IDs
// predecibles equipo01..equipo10 y correo equipo01@comfama.com.co...
const TARGET_TEAMS: { n: number; name: string }[] = [
  { n: 1, name: 'Asistente Omnicanal del Asesor' },
  { n: 2, name: 'Conector Inteligente de Subsidios' },
  { n: 3, name: 'Fenotipo Clínico por IA' },
  { n: 4, name: 'Agente de Voz para Cobranzas' },
  { n: 5, name: 'Predicción Comercial de Seguros' },
  { n: 6, name: 'IA para Adultos Mayores' },
  { n: 7, name: 'Acompañante Continuo de Salud Mental' },
  { n: 8, name: 'Legalización de Facturas con OCR' },
  { n: 9, name: 'Subsidios Automatizados – Calidad de Vida' },
  { n: 10, name: 'Conciliación Bancaria Automatizada' },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[()\-–—_.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateLoginCode(used: Set<string>): string {
  let code: string;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (used.has(code));
  used.add(code);
  return code;
}

type Idea = {
  id: string;
  codigo?: string;
  name?: string;
  nombreSolucion?: string;
};

type UserDoc = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  loginCode?: string;
  active?: boolean;
  teamIdeaId?: string;
};

async function main() {
  console.log('Leyendo iniciativas y usuarios de Firestore...');
  const [ideas, users] = await Promise.all([
    listDocs<Idea>('ideas'),
    listDocs<UserDoc>('users'),
  ]);
  console.log(`  - ${ideas.length} iniciativas`);
  console.log(`  - ${users.length} usuarios existentes`);

  const ideaByName = new Map<string, Idea>();
  for (const i of ideas) {
    const k = normalize(i.nombreSolucion || i.name || '');
    if (k) ideaByName.set(k, i);
  }

  const existingUserById = new Map<string, UserDoc>();
  for (const u of users) existingUserById.set(u.id, u);
  const usedCodes = new Set<string>();
  for (const u of users) if (u.loginCode) usedCodes.add(u.loginCode);

  const results: { equipo: string; iniciativa: string; email: string; code: string; id: string }[] = [];

  for (const t of TARGET_TEAMS) {
    const key = normalize(t.name);
    const idea = ideaByName.get(key);
    if (!idea) {
      console.warn(`  ⚠ No se encontró iniciativa para "${t.name}" (buscado como "${key}")`);
      continue;
    }

    const userId = `equipo${String(t.n).padStart(2, '0')}`;
    const email = `equipo${String(t.n).padStart(2, '0')}@comfama.com.co`;
    const existing = existingUserById.get(userId);
    const loginCode = existing?.loginCode ?? generateLoginCode(usedCodes);

    const doc: UserDoc = {
      id: userId,
      name: `Equipo ${t.n} · ${idea.nombreSolucion || idea.name || t.name}`,
      email,
      role: 'Equipo',
      avatarUrl: `https://picsum.photos/seed/${userId}/40/40`,
      loginCode,
      active: existing?.active ?? true,
      teamIdeaId: idea.id,
    };

    await setDoc(`users/${userId}`, doc);
    results.push({
      equipo: `Equipo ${t.n}`,
      iniciativa: idea.nombreSolucion || idea.name || '',
      email,
      code: loginCode,
      id: idea.id,
    });
  }

  console.log('\nUsuarios Equipo listos:\n');
  console.log('N°  Iniciativa                                         Email                              Código');
  console.log('---------------------------------------------------------------------------------------------------');
  for (const r of results) {
    const nombre = r.iniciativa.padEnd(50).slice(0, 50);
    const email = r.email.padEnd(34).slice(0, 34);
    console.log(`${r.equipo.padEnd(4)} ${nombre} ${email} ${r.code}`);
  }
  console.log(`\n✓ ${results.length}/${TARGET_TEAMS.length} usuarios sembrados.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('seed:teams falló:', err);
  process.exit(1);
});
