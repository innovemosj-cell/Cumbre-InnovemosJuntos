import type { Criterion, Frente, FrenteKey, RatingWeights } from './types';

export const FRENTES: Frente[] = [
  { key: 'estrategia', label: 'Estrategia', weight: 30, color: 'sky' },
  { key: 'impacto', label: 'Impacto', weight: 25, color: 'rose' },
  { key: 'innovacion', label: 'Innovación', weight: 15, color: 'violet' },
  { key: 'tecnico', label: 'Técnico', weight: 30, color: 'emerald' },
];

export const FRENTES_BY_KEY: Record<FrenteKey, Frente> = FRENTES.reduce(
  (acc, f) => ({ ...acc, [f.key]: f }),
  {} as Record<FrenteKey, Frente>
);

export const DEFAULT_FRENTE_WEIGHTS: RatingWeights = {
  estrategia: 30,
  impacto: 25,
  innovacion: 15,
  tecnico: 30,
};

export const CRITERIA: Criterion[] = [
  {
    id: 'alineacion-estrategica',
    key: 'alineacion_estrategica',
    frente: 'estrategia',
    label: 'Alineación estratégica',
    description:
      'La iniciativa de IA contribuye de forma directa y demostrable a uno o varios de los 7 orgullos / capacidades estratégicas definidos por Comfama.',
    weight: 60,
    order: 1,
    infoHelp: {
      title: 'Los 7 orgullos de Comfama',
      items: [
        'Consolidar el negocio de hábitat por fuera del 4%',
        'Parques 2.0',
        'Crecimiento de Salud',
        'Crecimiento de COSMO',
        'Biosuroeste',
        'Fortalecimiento Servicios Financieros',
        'Cambio demográfico',
      ],
    },
    levels: [
      { score: 1, label: 'Sin alineación', description: 'Resuelve algo útil pero no se conecta con los orgullos del año.' },
      { score: 2, label: 'Alineación indirecta', description: 'Apoya un orgullo organizacional de manera marginal o como efecto secundario.' },
      { score: 3, label: 'Alineación baja', description: 'Contribuye directamente a uno (1) de los 7 orgullos definidos por Comfama.' },
      { score: 4, label: 'Alineación alta', description: 'Contribuye a dos (2) o más orgullos.' },
    ],
  },
  {
    id: 'beneficio-estrategico',
    key: 'beneficio_estrategico',
    frente: 'estrategia',
    label: 'Beneficio Estratégico',
    description:
      '¿La iniciativa de IA genera un beneficio relevante para la organización, más allá de resolver una necesidad puntual de un área o proceso?',
    weight: 40,
    order: 2,
    levels: [
      { score: 1, label: 'No', description: 'Resuelve un problema puntual u operativo de un área. Útil, pero no mueve indicadores corporativos.' },
      { score: 5, label: 'Sí', description: 'Aporta a una prioridad clara: experiencia del afiliado, cobertura, eficiencia, sostenibilidad, nuevos ingresos.' },
    ],
  },
  {
    id: 'valor',
    key: 'valor',
    frente: 'impacto',
    label: 'Valor',
    description:
      '¿Qué tan claro y significativo es el valor que esta iniciativa entrega a los afiliados, colaboradores u operación de Comfama?',
    weight: 40,
    order: 3,
    levels: [
      { score: 1, label: 'Valor marginal', description: 'Resuelve una molestia menor o beneficia a un grupo muy reducido; difícil de medir.' },
      { score: 2, label: 'Valor focalizado', description: 'Genera mejoras concretas para un área o segmento, con impacto medible pero acotado.' },
      { score: 3, label: 'Valor amplio', description: 'Beneficia transversalmente a varios procesos, áreas o segmentos de afiliados; impacto claro y cuantificable.' },
      { score: 4, label: 'Valor estratégico', description: 'Genera un valor diferencial y sostenido a escala organizacional (experiencia, eficiencia, ingresos o cobertura).' },
    ],
  },
  {
    id: 'riesgo-no-implementacion',
    key: 'riesgo_no_implementacion',
    frente: 'impacto',
    label: 'Riesgo de No Implementación',
    description:
      '¿Qué tan costoso o riesgoso sería para Comfama NO desarrollar esta capacidad de IA?',
    weight: 30,
    order: 4,
    levels: [
      { score: 1, label: 'Riesgo bajo', description: 'Si no se hace, no pasa nada relevante. La operación sigue igual.' },
      { score: 2, label: 'Riesgo moderado', description: 'Se pierden algunas oportunidades de mejora, pero existen alternativas.' },
      { score: 3, label: 'Riesgo medio-alto', description: 'Mantiene ineficiencias visibles o deja a Comfama rezagada frente al sector.' },
      { score: 4, label: 'Riesgo alto', description: 'Compromete competitividad, cumplimiento, experiencia del afiliado o sostenibilidad del modelo.' },
    ],
  },
  {
    id: 'transforma-cultura',
    key: 'transforma_cultura',
    frente: 'impacto',
    label: 'Transforma cultura',
    description:
      '¿La iniciativa genera un cambio profundo y sostenible en cómo los equipos de Comfama trabajan, deciden o aprenden?',
    weight: 30,
    order: 5,
    levels: [
      { score: 1, label: 'No transformacional', description: 'El equipo usa la herramienta pero su rutina y forma de pensar no cambian.' },
      { score: 2, label: 'Transformación limitada', description: 'Algunos colaboradores adoptan hábitos puntuales, el cambio no escala más allá del piloto.' },
      { score: 3, label: 'Transformacional medio-alto', description: 'Los colaboradores trabajan en conjunto con soluciones: datos, IA, automatización.' },
      { score: 4, label: 'Altamente transformacional', description: 'Instala una nueva forma de trabajar transversal, integrando una fuerza laboral digital.' },
    ],
  },
  {
    id: 'novedad',
    key: 'novedad',
    frente: 'innovacion',
    label: 'Novedad',
    description:
      '¿Qué tan novedosa es la solución para Comfama y para el mercado?',
    weight: 60,
    order: 6,
    levels: [
      { score: 1, label: 'Solución conocida', description: 'La solución ya existe en Comfama o es una práctica ampliamente adoptada en el mercado.' },
      { score: 2, label: 'Adaptación innovadora', description: 'Combina capacidades existentes o adapta una solución conocida a un nuevo contexto de negocio.' },
      { score: 3, label: 'Innovación diferenciadora', description: 'Introduce capacidades o enfoques poco utilizados en Comfama y que generan una ventaja competitiva relevante.' },
      { score: 4, label: 'Innovación disruptiva', description: 'Propone una solución sin antecedentes en Comfama y con pocos referentes en el sector.' },
    ],
  },
  {
    id: 'tendencia-futuro',
    key: 'tendencia_futuro',
    frente: 'innovacion',
    label: 'Tendencia de Futuro',
    description:
      '¿La iniciativa prepara a Comfama frente a cambios sociales, tecnológicos, demográficos o del mercado que vienen en los próximos años?',
    weight: 40,
    order: 7,
    levels: [
      { score: 1, label: 'Sin alineación evidente', description: 'Resuelve un dolor presente; no se conecta con cambios estructurales del entorno.' },
      { score: 2, label: 'Alineación limitada', description: 'Toca tangencialmente alguna tendencia (envejecimiento, IA, sostenibilidad) sin enfoque claro.' },
      { score: 3, label: 'Alineación media-alta', description: 'Prepara a Comfama para una tendencia identificada: demografía, tecnología, mercado laboral, regulación.' },
      { score: 4, label: 'Alta alineación', description: 'Anticipa un cambio estructural y posiciona a Comfama como referente en los próximos años.' },
    ],
  },
  {
    id: 'estructura-datos',
    key: 'estructura_datos',
    frente: 'tecnico',
    label: 'Estructura de los Datos',
    description:
      '¿Dónde están y cómo están organizados hoy los datos que esta iniciativa necesitaría usar? A mayor estructura, más calidad de los datos para entrenarse y usarse con IA.',
    weight: 40,
    order: 8,
    levels: [
      { score: 1, label: 'No hay datos', description: 'No existen datos identificados o no hay claridad sobre fuentes, dueños o acceso.' },
      { score: 2, label: 'Información impresa', description: 'Los datos existen en papel, formularios físicos o documentos escaneados sin digitalizar.' },
      { score: 3, label: 'Excel o SharePoint', description: 'Hojas de cálculo, archivos compartidos o documentos digitales. Accesibles pero no centralizados.' },
      { score: 4, label: 'Base de datos', description: 'Datos en una base estructurada (SQL, NoSQL) con responsables y acceso controlado.' },
      { score: 5, label: 'Data lake', description: 'Centralizados, gobernados, trazables y listos para usar en modelos o agentes de IA.' },
    ],
  },
  {
    id: 'factibilidad-tecnica',
    key: 'factibilidad_tecnica',
    frente: 'tecnico',
    label: 'Factibilidad Técnica',
    description:
      '¿Qué tan posible es construir esta solución con la arquitectura, plataformas, proveedores y equipos que Comfama tiene hoy?',
    weight: 30,
    order: 9,
    levels: [
      { score: 1, label: 'Muy baja', description: 'Requiere tecnología o conocimientos que Comfama no tiene hoy ni están maduros en el mercado.' },
      { score: 2, label: 'Baja', description: 'Posible, pero depende de definiciones críticas pendientes (proveedor, plataforma, seguridad, licencias).' },
      { score: 3, label: 'Media', description: 'Hay una ruta clara pero requiere piloto, integraciones nuevas o ajustes de arquitectura previos.' },
      { score: 4, label: 'Alta', description: 'Se puede hacer con las plataformas actuales y equipos o proveedores disponibles.' },
      { score: 5, label: 'Muy alta', description: 'Reutiliza capacidades ya instaladas; la ruta de despliegue y el soporte están claros.' },
    ],
  },
  {
    id: 'tiempo-implementacion',
    key: 'tiempo_implementacion',
    frente: 'tecnico',
    label: 'Tiempo de Implementación',
    description:
      '¿En cuánto tiempo se podría llevar esta iniciativa a producción y empezar a entregar valor? Menos tiempo = mayor facilidad.',
    weight: 30,
    order: 10,
    levels: [
      { score: 1, label: 'Más de 12 meses', description: 'Apuesta de largo plazo: necesita habilitadores previos o coordinación plurianual.' },
      { score: 2, label: 'De 6 a 12 meses', description: 'Mediano plazo: requiere planeación entre áreas y varios hitos intermedios.' },
      { score: 3, label: 'Hasta 6 meses', description: 'Implementación rápida: un piloto o entrega completa en menos de medio año.' },
    ],
  },
];

export const CRITERIA_BY_ID: Record<string, Criterion> = CRITERIA.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<string, Criterion>
);

export function getCriteriaByFrente(frente: FrenteKey): Criterion[] {
  return CRITERIA.filter((c) => c.frente === frente);
}

export function maxScoreFor(criterion: Criterion): number {
  return Math.max(...criterion.levels.map((l) => l.score));
}
