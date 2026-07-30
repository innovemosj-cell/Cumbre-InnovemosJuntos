// Exporta a TXT las preguntas de la evaluación final tal como están HOY en
// Firestore (colección finalCriteria, con las ediciones del admin): categoría,
// peso, pregunta y significado de cada estrella.
// Uso: npx tsx --env-file=.env scripts/export-final-criteria-txt.ts

import { writeFileSync } from 'fs';
import { listDocs } from '../src/lib/firestore-rest';
import {
  DEFAULT_FINAL_CRITERIA,
  type FinalCriterion,
} from '../src/lib/final-criteria';

const ORDER = new Map(DEFAULT_FINAL_CRITERIA.map((c, i) => [c.key, i]));
const OUT = 'docs/preguntas-evaluacion-final.txt';

async function main() {
  const stored = await listDocs<FinalCriterion>('finalCriteria');
  const criteria = (stored.length ? stored : DEFAULT_FINAL_CRITERIA).sort(
    (a, b) => (ORDER.get(a.key) ?? 99) - (ORDER.get(b.key) ?? 99)
  );

  const lines: string[] = [];
  lines.push('EVALUACIÓN FINAL — HACKATHON DE IA COMFAMA');
  lines.push('Preguntas, categorías y significado de cada estrella (escala 1 a 5)');
  lines.push('='.repeat(70));
  lines.push('');

  criteria.forEach((c, i) => {
    lines.push(`${i + 1}. CATEGORÍA: ${c.label} (peso: ${c.weight}%)`);
    lines.push('');
    lines.push(`   Pregunta: ${c.question}`);
    lines.push('');
    lines.push('   Significado de las estrellas:');
    for (const s of [...c.starMeanings].sort((a, b) => a.stars - b.stars)) {
      lines.push(`   ${'★'.repeat(s.stars)}${'☆'.repeat(5 - s.stars)} (${s.stars}) ${s.label}`);
      lines.push(`      ${s.description}`);
    }
    lines.push('');
    lines.push('-'.repeat(70));
    lines.push('');
  });

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  lines.push(`Suma de los pesos: ${totalWeight}%`);
  lines.push(
    'Fuente: colección finalCriteria de Firestore (incluye ediciones del admin).'
  );

  writeFileSync(OUT, lines.join('\r\n'), 'utf8');
  console.log(`Archivo generado: ${OUT} (${criteria.length} criterios)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
