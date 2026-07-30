// Export XLSX con 3 hojas (Detalle, Resumen, Jurados). Solo Admin u Organizer.
//
// Exporta según el modo actual de la app: en "final" saca las votaciones de
// la evaluación final (finalRatings); en "preseleccion", los ratings por
// frente. Diseñado para correr el snapshot ANTES de resetear ratings, y como
// descarga reutilizable desde el panel del organizador.

import * as XLSX from 'xlsx';
import { getSession } from '@/lib/session';
import {
  getAppMode,
  getCriteria,
  getFinalCriteria,
  getIdeas,
  getIdeasWithResults,
  getRatingWeights,
  getUsers,
} from '@/lib/data';
import {
  compareFinalTotals,
  computeFinalTotals,
  finalRawScore,
  finalWeightedScore,
} from '@/lib/final-criteria';
import type { FrenteKey, User } from '@/lib/types';

export const runtime = 'edge';

const FRENTES: FrenteKey[] = ['estrategia', 'impacto', 'innovacion', 'tecnico'];

const FRENTE_LABEL: Record<FrenteKey, string> = {
  estrategia: 'Estrategia',
  impacto: 'Impacto',
  innovacion: 'Innovación',
  tecnico: 'Técnico',
};

function bool(v: boolean | undefined): string {
  if (v === false) return 'No';
  return 'Sí';
}

function dateOrEmpty(v: string | undefined): string {
  if (!v) return '';
  try {
    return new Date(v).toISOString().replace('T', ' ').slice(0, 19);
  } catch {
    return v;
  }
}

function xlsxResponse(wb: XLSX.WorkBook, filenameBase: string): Response {
  // Use 'array' (no Node Buffer en edge runtime).
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const ts = new Date().toISOString().slice(0, 10);
  return new Response(out, {
    status: 200,
    headers: {
      'content-type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${filenameBase}-${ts}.xlsx"`,
      'cache-control': 'no-store',
    },
  });
}

// Workbook de la EVALUACIÓN FINAL (estrellas): detalle por jurado, resumen
// tipo ranking y avance de los jurados.
async function buildFinalExport(): Promise<Response> {
  const [ideas, users, finalCriteria] = await Promise.all([
    getIdeas(),
    getUsers(),
    getFinalCriteria(),
  ]);
  const userById = new Map<string, User>(users.map((u) => [u.id, u]));
  const activeIdeas = ideas.filter((i) => i.active !== false);
  // Mismo número que ven los jurados en la app (posición en el catálogo).
  const numberById = new Map(activeIdeas.map((i, idx) => [i.id, idx + 1]));

  // ----- Hoja Detalle: una fila por (iniciativa, jurado) -----
  const detalleHeaders = [
    '# Iniciativa',
    'Iniciativa',
    'Área',
    'Jurado',
    'Email jurado',
    ...finalCriteria.map((c) => `${c.label} (${c.weight}%)`),
    'Total bruto',
    'Ponderado (1-5)',
    'Observaciones',
    'Fecha evaluación',
  ];
  const detalleRows: (string | number)[][] = [];
  for (const idea of activeIdeas) {
    const ratings = idea.finalRatings ?? {};
    const jurorIds = Object.keys(ratings);
    if (jurorIds.length === 0) {
      detalleRows.push([
        numberById.get(idea.id) ?? '',
        idea.nombreSolucion || idea.name,
        idea.area ?? '',
        '',
        '',
        ...finalCriteria.map(() => ''),
        '',
        '',
        '',
        '',
      ]);
      continue;
    }
    for (const jurorId of jurorIds) {
      const rating = ratings[jurorId];
      const juror = userById.get(jurorId);
      detalleRows.push([
        numberById.get(idea.id) ?? '',
        idea.nombreSolucion || idea.name,
        idea.area ?? '',
        juror?.name ?? jurorId,
        juror?.email ?? '',
        ...finalCriteria.map((c) => rating.scores?.[c.key] ?? ''),
        finalRawScore(rating),
        Number(finalWeightedScore(rating, finalCriteria).toFixed(2)),
        rating.observations ?? '',
        dateOrEmpty(rating.updatedAt),
      ]);
    }
  }

  // ----- Hoja Resumen: ranking con promedios por criterio -----
  const ranked = activeIdeas
    .map((idea) => ({
      idea,
      totals: computeFinalTotals(idea.finalRatings, finalCriteria),
    }))
    .sort((a, b) => compareFinalTotals(a.totals, b.totals));

  const resumenHeaders = [
    'Puesto',
    '# Iniciativa',
    'Iniciativa',
    'Área',
    '# Jurados',
    ...finalCriteria.map((c) => `${c.label} (prom.)`),
    'Total bruto',
    'Ponderado promedio (1-5)',
  ];
  const resumenRows = ranked.map((entry, i) => [
    entry.totals.ratingCount > 0 ? i + 1 : '',
    numberById.get(entry.idea.id) ?? '',
    entry.idea.nombreSolucion || entry.idea.name,
    entry.idea.area ?? '',
    entry.totals.ratingCount,
    ...finalCriteria.map((c) =>
      entry.totals.avgByCriterion[c.key] > 0
        ? Number(entry.totals.avgByCriterion[c.key].toFixed(2))
        : ''
    ),
    entry.totals.rawTotal,
    Number(entry.totals.weightedAvg.toFixed(2)),
  ]);

  // ----- Hoja Jurados: avance de cada jurado activo -----
  const jurors = users
    .filter((u) => u.role === 'Jurado' && u.active !== false)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const juradosHeaders = [
    'Nombre',
    'Email',
    'Rol en la organización',
    '# Iniciativas evaluadas',
    'Total iniciativas activas',
    'Estado',
  ];
  const juradosRows = jurors.map((u) => {
    const answered = activeIdeas.filter(
      (idea) => (idea.finalRatings ?? {})[u.id]
    ).length;
    return [
      u.name ?? '',
      u.email ?? '',
      u.rolOrganizacion ?? '',
      answered,
      activeIdeas.length,
      answered === activeIdeas.length && activeIdeas.length > 0
        ? 'Completo'
        : 'Pendiente',
    ];
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([detalleHeaders, ...detalleRows]),
    'Detalle'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([resumenHeaders, ...resumenRows]),
    'Resumen'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([juradosHeaders, ...juradosRows]),
    'Jurados'
  );
  return xlsxResponse(wb, 'evaluacion-final');
}

export async function GET() {
  try {
    const session = await getSession();
    if (
      !session.isLoggedIn ||
      (session.user.role !== 'Admin' && session.user.role !== 'Organizer')
    ) {
      return new Response(
        JSON.stringify({ error: 'No autorizado.' }),
        {
          status: 403,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    // En modo final se exportan las votaciones de la evaluación final; el
    // export de preselección (abajo) queda para cuando el admin vuelva a
    // ese modo.
    const appMode = await getAppMode();
    if (appMode === 'final') {
      return await buildFinalExport();
    }

    const [ideasWithTotals, criteria, weights, users] = await Promise.all([
      getIdeasWithResults(),
      getCriteria(),
      getRatingWeights(),
      getUsers(),
    ]);

    const userById = new Map<string, User>(users.map((u) => [u.id, u]));

    // Detectar IDs de criterios huérfanos (presentes en ratings pero ya no
    // existen como Criterion) para no perderlos en el snapshot.
    const knownIds = new Set(criteria.map((c) => c.id));
    const orphanIds = new Set<string>();
    for (const idea of ideasWithTotals) {
      for (const rating of Object.values(idea.ratings ?? {})) {
        for (const id of Object.keys(rating.scores ?? {})) {
          if (!knownIds.has(id)) orphanIds.add(id);
        }
      }
    }
    const allCriterionIds = [
      ...criteria.map((c) => c.id),
      ...Array.from(orphanIds).sort(),
    ];
    const criterionLabelById: Record<string, string> = {};
    for (const c of criteria) criterionLabelById[c.id] = c.label;
    for (const id of orphanIds) criterionLabelById[id] = `${id} (histórico)`;

    // ----- Hoja Detalle -----
    const detalleHeaders = [
      'Código',
      'Iniciativa',
      'Postulante',
      'Área',
      'Activa',
      'Jurado',
      'Email jurado',
      'Frentes evaluados',
      ...allCriterionIds.map((id) => criterionLabelById[id]),
      'Observaciones',
      'Fecha evaluación',
    ];

    const detalleRows: (string | number)[][] = [];
    for (const idea of ideasWithTotals) {
      const ratings = idea.ratings ?? {};
      const jurorIds = Object.keys(ratings);
      if (jurorIds.length === 0) {
        // Idea sin evaluaciones -> 1 fila con columnas vacías de jurado.
        detalleRows.push([
          idea.codigo ?? '',
          idea.nombreSolucion || idea.name,
          idea.postulante ?? '',
          idea.area ?? '',
          bool(idea.active),
          '',
          '',
          '',
          ...allCriterionIds.map(() => ''),
          '',
          '',
        ]);
        continue;
      }
      for (const jurorId of jurorIds) {
        const rating = ratings[jurorId];
        const juror = userById.get(jurorId);
        detalleRows.push([
          idea.codigo ?? '',
          idea.nombreSolucion || idea.name,
          idea.postulante ?? '',
          idea.area ?? '',
          bool(idea.active),
          juror?.name ?? jurorId,
          juror?.email ?? '',
          (rating.evaluatedFrentes ?? []).map((f) => FRENTE_LABEL[f]).join('; '),
          ...allCriterionIds.map((id) => {
            const v = rating.scores?.[id];
            return v === undefined ? '' : v;
          }),
          rating.observations ?? '',
          dateOrEmpty(rating.updatedAt),
        ]);
      }
    }

    // ----- Hoja Resumen por idea -----
    const resumenHeaders = [
      'Código',
      'Iniciativa',
      'Postulante',
      'Área',
      'Activa',
      '# Jurados',
      `Estrategia bruto (peso ${weights.estrategia}%)`,
      `Impacto bruto (peso ${weights.impacto}%)`,
      `Innovación bruto (peso ${weights.innovacion}%)`,
      `Técnico bruto (peso ${weights.tecnico}%)`,
      'Bruto Total',
      'Ponderado Total',
    ];

    const resumenRows = ideasWithTotals.map((idea) => [
      idea.codigo ?? '',
      idea.nombreSolucion || idea.name,
      idea.postulante ?? '',
      idea.area ?? '',
      bool(idea.active),
      idea.ratingCount,
      Number(idea.totalScores.porFrente.estrategia.raw.toFixed(2)),
      Number(idea.totalScores.porFrente.impacto.raw.toFixed(2)),
      Number(idea.totalScores.porFrente.innovacion.raw.toFixed(2)),
      Number(idea.totalScores.porFrente.tecnico.raw.toFixed(2)),
      Number(idea.totalScores.rawTotal.toFixed(2)),
      Number(idea.totalScores.weightedTotal.toFixed(2)),
    ]);

    // ----- Hoja Jurados -----
    const evaluationsByJuror = new Map<string, number>();
    for (const idea of ideasWithTotals) {
      for (const jurorId of Object.keys(idea.ratings ?? {})) {
        evaluationsByJuror.set(jurorId, (evaluationsByJuror.get(jurorId) ?? 0) + 1);
      }
    }
    const juradosHeaders = [
      'Nombre',
      'Email',
      'Rol',
      'Estado',
      'Frentes asignados',
      '# Iniciativas evaluadas',
    ];
    const juradosRows = users
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map((u) => [
        u.name ?? '',
        u.email ?? '',
        u.role,
        u.role === 'Jurado'
          ? u.active === false
            ? 'Inactivo'
            : 'Activo'
          : '—',
        (u.frentesAEvaluar ?? []).map((f) => FRENTE_LABEL[f]).join('; '),
        evaluationsByJuror.get(u.id) ?? 0,
      ]);

    // ----- Construir Workbook -----
    const wb = XLSX.utils.book_new();

    const wsDetalle = XLSX.utils.aoa_to_sheet([detalleHeaders, ...detalleRows]);
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle');

    const wsResumen = XLSX.utils.aoa_to_sheet([resumenHeaders, ...resumenRows]);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    const wsJurados = XLSX.utils.aoa_to_sheet([juradosHeaders, ...juradosRows]);
    XLSX.utils.book_append_sheet(wb, wsJurados, 'Jurados');

    return xlsxResponse(wb, 'evaluaciones-hackathon');
  } catch (e: any) {
    console.error('[api/admin/export-evaluaciones] error', {
      name: e?.name,
      message: e?.message,
      stack: e?.stack?.slice(0, 600),
    });
    return new Response(
      JSON.stringify({ error: 'No se pudo generar el archivo.' }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
