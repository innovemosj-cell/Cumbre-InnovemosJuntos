export type FrenteKey = 'estrategia' | 'impacto' | 'innovacion' | 'tecnico';

export type Frente = {
  key: FrenteKey;
  label: string;
  weight: number;
  color: string;
};

export type CriterionLevel = {
  score: number;
  label: string;
  description: string;
};

export type CriterionInfoHelp = {
  title?: string;
  items: string[];
};

export type Criterion = {
  id: string;
  key: string;
  frente: FrenteKey;
  label: string;
  description: string;
  weight: number;
  levels: CriterionLevel[];
  order: number;
  infoHelp?: CriterionInfoHelp;
};

export type Rating = {
  scores: Record<string, number>;
  observations?: string;
  evaluatedFrentes: FrenteKey[];
  updatedAt?: string;
};

// Modo global de la app. "preseleccion" usa los criterios por frente
// (evaluación original); "final" usa las 5 preguntas con estrellas para
// escoger las 3 iniciativas ganadoras. Se guarda en config/appMode.
export type AppMode = 'preseleccion' | 'final';

export type FinalCriterionKey =
  | 'originality'
  | 'scalability'
  | 'impact'
  | 'demo'
  | 'clarity';

// Calificación de la evaluación final (1 a 5 estrellas por criterio).
// Se guarda en el campo finalRatings de la iniciativa, separado de
// ratings para no perder la preselección.
export type FinalRating = {
  scores: Record<FinalCriterionKey, number>;
  observations?: string;
  updatedAt?: string;
};

export type Idea = {
  id: string;
  codigo: string;
  name: string;
  nombreSolucion?: string;
  postulante?: string;
  group: string;
  area: string;
  description: string;
  problema?: string;
  contextoActual?: string;
  beneficiarios?: string;
  relevancia?: string;
  hipotesisIA?: string;
  escenarioFuturo?: string;
  indicadoresValor?: string;
  nivelMadurez?: string;
  resumenEjecutivo?: string;
  puntosFuertes?: string;
  aspectosAMejorar?: string;
  tecnologiasRecomendadas?: string;
  riesgo?: string;
  manejaDatosSensibles?: string;
  distribucionValor?: string;
  eficienciaFTE?: string;
  detalleEficiencia?: string;
  imageUrl: string;
  imageUrl_2: string;
  ratings: Record<string, Rating>;
  finalRatings?: Record<string, FinalRating>;
  order?: number;
  active?: boolean;
  audioUrl?: string;
  audioGeneratedAt?: string;
};

// Voto del público: un documento por votante (id del doc = voterId de la
// cookie). Documento propio para evitar el límite de ~1 escritura/segundo
// que tendría un mapa de votos dentro del doc de la idea.
export type PublicVote = {
  id?: string;
  ideaId: string;
  createdAt?: string;
};

export type UserRole = 'Jurado' | 'Admin' | 'Organizer' | 'Equipo';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  loginCode?: string;
  frentesAEvaluar?: FrenteKey[];
  rolOrganizacion?: string;
  // Aplica a Jurados y Equipos. undefined o true = activo. false = no puede ingresar.
  active?: boolean;
  // Solo aplica a Equipos: id de la iniciativa que pueden editar.
  teamIdeaId?: string;
};

export type FrenteScore = {
  raw: number;
  weighted: number;
  ratedCount: number;
};

export type IdeaWithTotals = Idea & {
  totalScores: {
    porFrente: Record<FrenteKey, FrenteScore>;
    rawTotal: number;
    weightedTotal: number;
  };
  ratingCount: number;
  voters: User[];
};

export type RatingWeights = Record<FrenteKey, number>;

export type IdeaWithJurorRating = Omit<Idea, 'ratings'> & {
  jurorRating?: Rating;
};

export type IdeaWithJurorFinalRating = Omit<Idea, 'ratings' | 'finalRatings'> & {
  jurorFinalRating?: FinalRating;
};

// Totales de la evaluación final por iniciativa.
export type IdeaWithFinalTotals = Idea & {
  finalTotals: {
    // Promedio de estrellas por criterio entre los jurados que calificaron.
    avgByCriterion: Record<FinalCriterionKey, number>;
    // Suma de estrellas de todos los criterios y jurados (puntaje bruto).
    rawTotal: number;
    // Promedio por jurado del puntaje ponderado (escala 1 a 5).
    weightedAvg: number;
    ratingCount: number;
  };
  finalVoters: User[];
};
