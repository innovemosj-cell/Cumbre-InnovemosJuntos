// Criterios de la EVALUACIÓN FINAL (modo "final" de la app).
// Fuente: Insumo/preguntas-evaluacion.txt. Escala de 1 a 5 estrellas por
// criterio; cada estrella tiene una aclaración de qué significa asignarla.
// Estos valores son la SEMILLA por defecto: el admin puede editar preguntas,
// textos de las estrellas y pesos desde /admin/criterios (se guardan en la
// colección finalCriteria de Firestore). Las claves (key) son fijas porque
// las calificaciones guardadas las referencian.

import type { FinalCriterionKey, FinalRating } from './types';

export type FinalStarMeaning = {
  stars: number;
  label: string;
  description: string;
};

export type FinalCriterion = {
  key: FinalCriterionKey;
  label: string;
  weight: number;
  question: string;
  starMeanings: FinalStarMeaning[];
};

export const FINAL_OBSERVATIONS_MAX = 300;

export const DEFAULT_FINAL_CRITERIA: FinalCriterion[] = [
  {
    key: 'originality',
    label: 'Originalidad e Innovación',
    weight: 25,
    question:
      '¿La iniciativa propone una idea creativa, una mejora significativa o una nueva forma de hacer las cosas para resolver el desafío?',
    starMeanings: [
      {
        stars: 1,
        label: 'Sin novedad',
        description:
          'Replica algo que ya existe, sin ningún elemento diferenciador ni creatividad en la propuesta.',
      },
      {
        stars: 2,
        label: 'Novedad leve',
        description:
          'Introduce pequeños ajustes sobre soluciones conocidas; el cambio propuesto es marginal.',
      },
      {
        stars: 3,
        label: 'Mejora significativa',
        description:
          'Combina o adapta soluciones existentes con ingenio y logra una mejora clara frente a lo actual.',
      },
      {
        stars: 4,
        label: 'Muy innovadora',
        description:
          'Propone una solución poco habitual y creativa; introduce un cambio relevante en la forma de resolver el desafío.',
      },
      {
        stars: 5,
        label: 'Disruptiva',
        description:
          'Plantea una nueva forma de hacer las cosas, con uso ingenioso de los recursos y un diferencial evidente.',
      },
    ],
  },
  {
    key: 'scalability',
    label: 'Escalabilidad y soporte',
    weight: 20,
    question:
      '¿Qué tan fácil sería llevar esta solución a más personas, áreas o territorios, y darle el soporte necesario para que siga funcionando?',
    starMeanings: [
      {
        stars: 1,
        label: 'Solo funciona aquí',
        description:
          'Sirve únicamente para el caso puntual que muestra; llevarla a otro lado exigiría rehacerla.',
      },
      {
        stars: 2,
        label: 'Difícil de escalar',
        description:
          'Podría crecer, pero con mucho esfuerzo, costo o dependencias que la hacen difícil de soportar.',
      },
      {
        stars: 3,
        label: 'Escalable con ajustes',
        description:
          'Con cambios razonables podría usarse en otras áreas o públicos, con un soporte manejable.',
      },
      {
        stars: 4,
        label: 'Fácil de escalar',
        description:
          'Está pensada para crecer: llevarla a más áreas o personas sería sencillo y su soporte, simple.',
      },
      {
        stars: 5,
        label: 'Escala transformadora',
        description:
          'Puede crecer en la organización y en la sociedad con un soporte sencillo, sin depender de su contexto actual.',
      },
    ],
  },
  {
    key: 'impact',
    label: 'IA para la productividad',
    weight: 25,
    question:
      '¿La iniciativa usa la inteligencia artificial para mejorar la productividad: ahorrar tiempo, reducir tareas repetitivas, optimizar recursos o mejorar la calidad del trabajo?',
    starMeanings: [
      {
        stars: 1,
        label: 'Sin aporte a la productividad',
        description:
          'La IA no genera ahorros de tiempo ni mejoras visibles en la forma de trabajar.',
      },
      {
        stars: 2,
        label: 'Aporte menor',
        description:
          'Mejora tareas puntuales, con un beneficio pequeño o difícil de medir.',
      },
      {
        stars: 3,
        label: 'Aporte claro',
        description:
          'Ahorra tiempo o recursos de forma visible en un proceso o equipo concreto.',
      },
      {
        stars: 4,
        label: 'Alta productividad',
        description:
          'Genera ahorros o mejoras importantes y medibles en varios procesos o equipos.',
      },
      {
        stars: 5,
        label: 'Transforma la productividad',
        description:
          'Cambia la forma de trabajar: ahorros significativos, medibles y sostenidos gracias a la IA.',
      },
    ],
  },
  {
    key: 'demo',
    label: 'Demostración técnica',
    weight: 20,
    question:
      '¿Qué tan funcional fue la demostración técnica presentada por el equipo?',
    starMeanings: [
      {
        stars: 1,
        label: 'Sin prototipo funcional',
        description:
          'No se muestra un prototipo ni algo funcional de la solución.',
      },
      {
        stars: 2,
        label: 'Prototipo estático',
        description:
          'Se mostraron pantallas o maquetas con interacción mínima; casi todo era simulado.',
      },
      {
        stars: 3,
        label: 'Parcialmente funcional',
        description:
          'Parte del flujo funciona en vivo, aunque hay tramos simulados o incompletos.',
      },
      {
        stars: 4,
        label: 'Casi todo funcional',
        description:
          'La demostración en vivo funciona de principio a fin; solo detalles menores simulados.',
      },
      {
        stars: 5,
        label: 'Totalmente funcional',
        description:
          'Demostración totalmente funcional, en vivo y con interacción real del producto.',
      },
    ],
  },
  {
    key: 'clarity',
    label: 'Claridad de la comunicación',
    weight: 10,
    question:
      '¿El equipo comunicó su idea con claridad: se entendió el problema, la solución y el valor que aporta?',
    starMeanings: [
      {
        stars: 1,
        label: 'Confusa',
        description:
          'No se entiende el problema ni la solución; la presentación fue desordenada.',
      },
      {
        stars: 2,
        label: 'Poco clara',
        description:
          'Se entiende la idea general, pero quedan vacíos sobre el problema, la solución o su valor.',
      },
      {
        stars: 3,
        label: 'Clara',
        description:
          'Comunica bien el problema, la solución y su valor.',
      },
      {
        stars: 4,
        label: 'Muy clara',
        description:
          'Comunica muy bien la idea, con un mensaje ordenado que destaca y se recuerda.',
      },
      {
        stars: 5,
        label: 'Excepcional',
        description:
          'Comunicación impecable: claridad total y un mensaje que deja huella en la audiencia.',
      },
    ],
  },
];

export const FINAL_CRITERION_KEYS = DEFAULT_FINAL_CRITERIA.map((c) => c.key);

// Puntaje ponderado de una calificación final (escala 1 a 5):
// suma de estrellas * peso / 100. Los pesos suman 100.
export function finalWeightedScore(
  rating: FinalRating,
  criteria: FinalCriterion[]
): number {
  return criteria.reduce(
    (sum, c) => sum + ((rating.scores?.[c.key] ?? 0) * c.weight) / 100,
    0
  );
}

// Puntaje bruto de una calificación final: suma simple de estrellas
// (máx. 5 por criterio).
export function finalRawScore(rating: FinalRating): number {
  return FINAL_CRITERION_KEYS.reduce(
    (sum, key) => sum + (rating.scores?.[key] ?? 0),
    0
  );
}

export type FinalTotals = {
  avgByCriterion: Record<FinalCriterionKey, number>;
  rawTotal: number;
  weightedAvg: number;
  ratingCount: number;
};

// Totales de una iniciativa a partir de sus calificaciones finales. Función
// pura (sin Firestore): la usa el servidor y también el botón "Actualizar"
// del organizador para recalcular el ranking en el navegador.
export function computeFinalTotals(
  finalRatings: Record<string, FinalRating> | undefined,
  criteria: FinalCriterion[]
): FinalTotals {
  const ratingsList = Object.values(finalRatings ?? {});
  const avgByCriterion = {} as Record<FinalCriterionKey, number>;
  for (const c of criteria) {
    const values = ratingsList
      .map((r) => r.scores?.[c.key])
      .filter((v): v is number => typeof v === 'number' && v > 0);
    avgByCriterion[c.key] = values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }
  const rawTotal = ratingsList.reduce((sum, r) => sum + finalRawScore(r), 0);
  const weightedAvg = ratingsList.length
    ? ratingsList.reduce(
        (sum, r) => sum + finalWeightedScore(r, criteria),
        0
      ) / ratingsList.length
    : 0;
  return {
    avgByCriterion,
    rawTotal,
    weightedAvg,
    ratingCount: ratingsList.length,
  };
}

// Orden del ranking final: mayor ponderado; empate por total bruto.
export function compareFinalTotals(a: FinalTotals, b: FinalTotals): number {
  return b.weightedAvg - a.weightedAvg || b.rawTotal - a.rawTotal;
}
