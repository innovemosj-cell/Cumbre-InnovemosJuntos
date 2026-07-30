import 'dotenv/config';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { listDocs, setDoc, deleteDoc } from '../src/lib/firestore-rest';
import type { FrenteKey } from '../src/lib/types';

const INSUMO_DIR = path.resolve(process.cwd(), 'Insumo');

const SOLUTION_NAMES: Record<string, string> = {
  '136': 'Inteligencia Territorial Comfama',
  '48': 'Asistente Omnicanal del Asesor',
  '97': 'Predicción Inteligente de Inventarios',
  '71': 'Asistente Documental de Procesos',
  '111': 'Acompañante Continuo de Salud Mental',
  '138': 'Asistente de Investigación Regional',
  '90': 'Predicción Comercial de Seguros',
  '153': 'Fenotipo Clínico por IA',
  '110': 'Contratos Inteligentes (RAG)',
  '147': 'Analista Virtual de Predios',
  '37': 'Alerta Temprana en Preescolares',
  '69': 'Cumplimiento PESV Automatizado',
  '103': 'Agente de Voz para Cobranzas',
  '159': 'IA para Adultos Mayores',
  '40': 'Lector de Estructuras Organizacionales',
  '47': 'Conector Inteligente de Subsidios',
  '61': 'Legalización de Facturas con OCR',
  '100': 'Subsidios Automatizados (Calidad de Vida)',
  '156': 'Conciliación Automática de Tesorerías',
  '115': 'Conciliador IA de Convenios',
  '106': 'Detección de Anomalías en Nómina',
  '143': 'Conciliación Bancaria Automatizada',
};

function extractFTEHeadline(detalle: string): string {
  if (!detalle) return '';
  const firstLine = detalle.split(/\r?\n/)[0] || '';
  return firstLine.trim();
}

function generateLoginCode(used: Set<string>): string {
  let code: string;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (used.has(code));
  used.add(code);
  return code;
}

function clean(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function parseFrentes(rollApp: string): FrenteKey[] {
  const s = rollApp.toLowerCase();
  const out: FrenteKey[] = [];
  if (s.includes('estrategia')) out.push('estrategia');
  if (s.includes('impacto')) out.push('impacto');
  if (s.includes('innovaci')) out.push('innovacion');
  if (s.includes('técnico') || s.includes('tecnico')) out.push('tecnico');
  return out;
}

function slugId(value: string, fallbackIndex: number): string {
  const base = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || `item-${fallbackIndex}`;
}

async function loadIdeasFromExcel() {
  const wb = XLSX.readFile(path.join(INSUMO_DIR, 'Iniciativas_Evaluadas.xlsx'));

  const evalRows = XLSX.utils.sheet_to_json<any>(wb.Sheets['evaluación'], {
    defval: null,
    raw: false,
  });
  const baseRows = XLSX.utils.sheet_to_json<any>(wb.Sheets['Hoja1'], {
    defval: null,
    raw: false,
  });

  const baseById = new Map<string, any>();
  for (const r of baseRows) baseById.set(clean(r.ID), r);

  const selected = evalRows.filter(
    (r) => clean(r.Estado).toLowerCase() === 'seleccionada'
  );

  return selected.map((r, i) => {
    const base = baseById.get(clean(r.ID)) ?? {};
    const codigo = clean(r.ID);
    const postulante = clean(r.Postulante || base['Nombre postulante']);
    const equipoGeneral = clean(r['Equipo General'] || base['Equipo general']);
    const equipoDirecto = clean(base['Equipo de Trabajo Directo']);
    const nombreSolucion =
      SOLUTION_NAMES[codigo] ?? `Iniciativa ${equipoDirecto || equipoGeneral}`;
    const name = nombreSolucion;
    const id = slugId(`${codigo}-${nombreSolucion}`, i + 1);
    const detalleEficiencia = clean(
      r['Detalle\r\nEficiencia'] || r['Detalle Eficiencia']
    );
    const fteHeadline = extractFTEHeadline(detalleEficiencia);

    return {
      id,
      codigo,
      name,
      nombreSolucion,
      postulante,
      group: equipoGeneral || 'Sin equipo',
      area: equipoDirecto || equipoGeneral || 'Sin área',
      description: '',
      problema: clean(r.Problema || base['Problema']),
      contextoActual: clean(base['Contexto actual']),
      beneficiarios: clean(base['beneficiarios']),
      relevancia: clean(base['Relevancia']),
      hipotesisIA: clean(base['Hipótesis de IA']),
      escenarioFuturo: clean(base['Escenario futuro']),
      indicadoresValor: clean(base['Indicadores de valor']),
      nivelMadurez: clean(base['Nivel de madurez']),
      resumenEjecutivo: clean(r['Resumen Ejecutivo']),
      puntosFuertes: clean(r['Puntos Fuertes']),
      aspectosAMejorar: clean(r['Aspectos a Mejorar']),
      tecnologiasRecomendadas: clean(r['Tecnologías Recomendadas']),
      riesgo: clean(r['Riesgo']),
      manejaDatosSensibles: clean(r['Maneja Datos\r\nSensibles'] || r['Maneja Datos Sensibles']),
      distribucionValor: clean(r['Distribución\r\nde Valor'] || r['Distribución de Valor']),
      eficienciaFTE: fteHeadline,
      detalleEficiencia,
      imageUrl: `https://picsum.photos/seed/${id}/800/450`,
      imageUrl_2: `https://picsum.photos/seed/${id}-2/800/600`,
      ratings: {},
      order: i + 1,
      active: true,
    };
  });
}

function loadJurorsFromExcel(used: Set<string>) {
  const wb = XLSX.readFile(path.join(INSUMO_DIR, 'Jurados.xlsx'));
  const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets['Hoja1'], { defval: null, raw: false });

  return rows
    .filter((r) => clean(r['Nombre']))
    .map((r, i) => {
      const name = clean(r['Nombre']);
      const id = slugId(name, i + 1);
      const frentes = parseFrentes(clean(r['Roll APP']));
      const localPart = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/(^\.|\.$)/g, '');
      return {
        id,
        name,
        email: `${localPart}@comfama.com.co`,
        role: 'Jurado' as const,
        avatarUrl: `https://picsum.photos/seed/${id}/40/40`,
        loginCode: generateLoginCode(used),
        frentesAEvaluar: frentes,
        rolOrganizacion: clean(r['Roll organización']),
      };
    });
}

async function wipeCollection(coll: string) {
  const docs = await listDocs<{ id: string }>(coll);
  for (const d of docs) {
    await deleteDoc(`${coll}/${d.id}`);
  }
  console.log(`  - wiped ${docs.length} docs de ${coll}`);
}

async function main() {
  console.log('Cargando datos desde Insumo/...');
  const ideas = await loadIdeasFromExcel();
  console.log(`  - ${ideas.length} iniciativas seleccionadas`);

  const existingUsers = await listDocs<any>('users');
  const existingCodeById = new Map<string, string>();
  for (const u of existingUsers) {
    if (u.id && u.loginCode) existingCodeById.set(u.id, u.loginCode);
  }
  const usedCodes = new Set<string>(existingCodeById.values());

  const jurors = loadJurorsFromExcel(usedCodes).map((j) => ({
    ...j,
    loginCode: existingCodeById.get(j.id) ?? j.loginCode,
  }));
  console.log(`  - ${jurors.length} jurados`);

  const adminCode = existingCodeById.get('admin1') ?? generateLoginCode(usedCodes);
  const organizerCode = existingCodeById.get('organizer1') ?? generateLoginCode(usedCodes);

  const adminUser = {
    id: 'admin1',
    name: 'Admin Hackathon',
    email: 'admin@comfama.com.co',
    role: 'Admin' as const,
    avatarUrl: 'https://picsum.photos/seed/admin/40/40',
    loginCode: adminCode,
  };

  const organizerUser = {
    id: 'organizer1',
    name: 'Organizador Hackathon',
    email: 'organizer@comfama.com.co',
    role: 'Organizer' as const,
    avatarUrl: 'https://picsum.photos/seed/organizer/40/40',
    loginCode: organizerCode,
  };

  console.log('\nLimpiando colecciones previas...');
  await wipeCollection('ideas');
  await wipeCollection('users');
  await wipeCollection('criteria');

  console.log('\nSembrando ideas...');
  for (const idea of ideas) {
    await setDoc(`ideas/${idea.id}`, idea);
  }
  console.log(`  ✓ ${ideas.length} iniciativas`);

  console.log('\nSembrando jurados...');
  for (const j of jurors) {
    await setDoc(`users/${j.id}`, j);
    console.log(`  - Jurado    ${j.name.padEnd(28)} loginCode: ${j.loginCode}  frentes: ${j.frentesAEvaluar.join(', ')}`);
  }

  console.log('\nSembrando admin y organizador...');
  await setDoc(`users/${adminUser.id}`, adminUser);
  console.log(`  - Admin      ${adminUser.email.padEnd(30)} loginCode: ${adminUser.loginCode}`);
  await setDoc(`users/${organizerUser.id}`, organizerUser);
  console.log(`  - Organizer  ${organizerUser.email.padEnd(30)} loginCode: ${organizerUser.loginCode}`);

  console.log('\nActualizando config/ratingWeights...');
  await setDoc('config/ratingWeights', {
    estrategia: 30,
    impacto: 25,
    innovacion: 15,
    tecnico: 30,
  });
  console.log('  ✓ pesos: Estrategia 30 · Impacto 25 · Innovación 15 · Técnico 30');

  console.log('\nListo.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed falló:', err);
  process.exit(1);
});
