import 'server-only';
import * as React from 'react';
import { unstable_noStore as noStore } from 'next/cache';

// Memoización POR PETICIÓN (React.cache): si varios componentes o funciones
// piden los mismos datos durante el render de una misma página, Firestore se
// consulta una sola vez. No es caché entre peticiones: cada página sigue
// leyendo datos frescos. Fallback a identidad por si el runtime no la trae.
const perRequest: <T extends (...args: any[]) => any>(fn: T) => T =
  (React as any).cache ?? ((fn: any) => fn);
import {
  getDoc,
  listDocs,
  setDoc,
  updateDoc,
  updateNestedField,
  runQuery,
  commitBatch,
  newDocId,
  fieldEquals,
  type BatchWrite,
} from './firestore-rest';
import type {
  Idea,
  User,
  Rating,
  PublicVote,
  IdeaWithTotals,
  RatingWeights,
  Criterion,
  IdeaWithJurorRating,
  IdeaWithJurorFinalRating,
  IdeaWithFinalTotals,
  FrenteKey,
  FrenteScore,
  AppMode,
  FinalRating,
} from './types';
import {
  CRITERIA as SEED_CRITERIA,
  CRITERIA_BY_ID,
  DEFAULT_FRENTE_WEIGHTS,
  FRENTES,
  maxScoreFor,
} from './criteria-data';
import {
  DEFAULT_FINAL_CRITERIA,
  compareFinalTotals,
  computeFinalTotals,
  type FinalCriterion,
} from './final-criteria';

let bootstrappedCriteria = false;

async function bootstrapCriteriaIfNeeded(): Promise<void> {
  if (bootstrappedCriteria) return;
  const existing = await listDocs<Criterion>('criteria');
  if (existing.length === 0) {
    for (const c of SEED_CRITERIA) {
      await setDoc(`criteria/${c.id}`, c as unknown as Record<string, any>);
    }
  }
  bootstrappedCriteria = true;
}

export const getCriteria = perRequest(async (): Promise<Criterion[]> => {
  noStore();
  const stored = await listDocs<Criterion>('criteria');
  if (stored.length === 0) {
    await bootstrapCriteriaIfNeeded();
    return SEED_CRITERIA;
  }
  return stored.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
});

export async function getCriterionById(id: string): Promise<Criterion | undefined> {
  const doc = await getDoc<Criterion>(`criteria/${id}`);
  return doc ?? undefined;
}

export async function setCriterion(criterion: Criterion): Promise<void> {
  await setDoc(`criteria/${criterion.id}`, criterion as unknown as Record<string, any>);
}

export async function deleteCriterion(id: string): Promise<void> {
  const { deleteDoc } = await import('./firestore-rest');
  await deleteDoc(`criteria/${id}`);
}

export const getIdeas = perRequest(async (): Promise<Idea[]> => {
  noStore();
  const ideas = await listDocs<Idea>('ideas');
  return ideas.sort((a, b) => {
    const aOrder = a.order ?? Infinity;
    const bOrder = b.order ?? Infinity;
    return aOrder - bOrder;
  });
});

export async function getActiveIdeas(): Promise<Idea[]> {
  const ideas = await getIdeas();
  return ideas.filter((i) => i.active !== false);
}

export async function deleteIdea(id: string): Promise<void> {
  const { deleteDoc } = await import('./firestore-rest');
  // Best-effort: borrar audio del podcast si existe. No bloquea si falla.
  try {
    const { deleteFile } = await import('./firebase-storage');
    await deleteFile(`podcasts/${id}.wav`);
  } catch (err) {
    console.error('[deleteIdea] no se pudo borrar audio:', { id, err });
  }
  await deleteDoc(`ideas/${id}`);
}

export async function reorderIdeas(idsInOrder: string[]): Promise<void> {
  if (idsInOrder.length === 0) return;
  const writes: BatchWrite[] = idsInOrder.map((id, index) => ({
    type: 'update',
    path: `ideas/${id}`,
    data: { order: index },
    fieldPaths: ['order'],
  }));
  await commitBatch(writes);
}

export async function resetAllRatings(): Promise<number> {
  const ideas = await getIdeas();
  if (ideas.length === 0) return 0;
  const writes: BatchWrite[] = ideas.map((idea) => ({
    type: 'update',
    path: `ideas/${idea.id}`,
    data: { ratings: {} },
    fieldPaths: ['ratings'],
  }));
  await commitBatch(writes);
  return ideas.length;
}

// Borra solo los votos de la EVALUACIÓN FINAL (estrellas). No toca los
// ratings de la preselección.
export async function resetAllFinalRatings(): Promise<number> {
  const ideas = await getIdeas();
  if (ideas.length === 0) return 0;
  const writes: BatchWrite[] = ideas.map((idea) => ({
    type: 'update',
    path: `ideas/${idea.id}`,
    data: { finalRatings: {} },
    fieldPaths: ['finalRatings'],
  }));
  await commitBatch(writes);
  return ideas.length;
}

export async function updateIdea(id: string, data: Partial<Idea>): Promise<void> {
  await updateDoc(`ideas/${id}`, data);
}

export async function getIdeaById(id: string): Promise<Idea | undefined> {
  const doc = await getDoc<Idea>(`ideas/${id}`);
  return doc ?? undefined;
}

export const getUsers = perRequest(async (): Promise<User[]> => {
  noStore();
  return listDocs<User>('users');
});

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const results = await runQuery<User>({
    from: [{ collectionId: 'users' }],
    where: fieldEquals('email', email),
    limit: 1,
  });
  return results[0];
}

export async function getUserByLoginCode(
  loginCode: string
): Promise<User | undefined> {
  const results = await runQuery<User>({
    from: [{ collectionId: 'users' }],
    where: fieldEquals('loginCode', loginCode),
    limit: 1,
  });
  return results[0];
}

export async function getUserById(id: string): Promise<User | undefined> {
  const doc = await getDoc<User>(`users/${id}`);
  return doc ?? undefined;
}

export async function getUsersByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];
  // Una sola lectura de la colección (memoizada por petición) en lugar de
  // un getDoc por id: con N jurados eran N requests a Firestore.
  const idSet = new Set(ids);
  const users = await getUsers();
  return users.filter((u) => idSet.has(u.id));
}

export async function saveRating(
  ideaId: string,
  jurorId: string,
  rating: Rating
): Promise<boolean> {
  try {
    await updateNestedField(`ideas/${ideaId}`, `ratings.${jurorId}`, rating);
    return true;
  } catch (error) {
    console.error('Error saving rating:', { message: (error as any)?.message });
    return false;
  }
}

type NewIdeaInput = Omit<Idea, 'id' | 'ratings' | 'imageUrl_2'> & {
  imageUrl_2?: string;
};

function withImageFallback(idea: NewIdeaInput): Omit<Idea, 'id' | 'ratings'> {
  return {
    ...idea,
    imageUrl_2: idea.imageUrl_2 || idea.imageUrl,
  };
}

export async function addIdea(idea: NewIdeaInput) {
  const id = newDocId();
  await setDoc(`ideas/${id}`, { ...withImageFallback(idea), id, ratings: {} });
}

export async function addIdeas(ideas: NewIdeaInput[]) {
  const writes: BatchWrite[] = ideas.map((idea) => {
    const id = newDocId();
    return {
      type: 'set',
      path: `ideas/${id}`,
      data: { ...withImageFallback(idea), id, ratings: {} },
    };
  });
  await commitBatch(writes);
}

export type UserCreate = Omit<User, 'id'> & { id: string };

export async function addUser(user: UserCreate) {
  await setDoc(`users/${user.id}`, user);
}

export async function updateUser(userId: string, data: Partial<User>) {
  await updateDoc(`users/${userId}`, data);
}

// ---------------------------------------------------------------------------
// Modo global de la app (preselección / evaluación final)
// ---------------------------------------------------------------------------

export const getAppMode = perRequest(async (): Promise<AppMode> => {
  noStore();
  const doc = await getDoc<{ mode: AppMode }>('config/appMode');
  return doc?.mode === 'final' ? 'final' : 'preseleccion';
});

export async function updateAppMode(mode: AppMode): Promise<void> {
  await setDoc('config/appMode', { mode });
}

// ---------------------------------------------------------------------------
// Evaluación final (estrellas). Se guarda en finalRatings, separado de
// ratings para preservar la preselección. Los criterios (preguntas, textos
// de estrellas y pesos) son editables por el admin: colección finalCriteria.
// ---------------------------------------------------------------------------

let bootstrappedFinalCriteria = false;

async function bootstrapFinalCriteriaIfNeeded(): Promise<void> {
  if (bootstrappedFinalCriteria) return;
  const existing = await listDocs<FinalCriterion>('finalCriteria');
  if (existing.length === 0) {
    for (const c of DEFAULT_FINAL_CRITERIA) {
      await setDoc(`finalCriteria/${c.key}`, c as unknown as Record<string, any>);
    }
  }
  bootstrappedFinalCriteria = true;
}

const FINAL_CRITERIA_ORDER = new Map(
  DEFAULT_FINAL_CRITERIA.map((c, i) => [c.key, i])
);

export const getFinalCriteria = perRequest(
  async (): Promise<FinalCriterion[]> => {
    noStore();
    const stored = await listDocs<FinalCriterion>('finalCriteria');
    if (stored.length === 0) {
      await bootstrapFinalCriteriaIfNeeded();
      return DEFAULT_FINAL_CRITERIA;
    }
    return stored.sort(
      (a, b) =>
        (FINAL_CRITERIA_ORDER.get(a.key) ?? 99) -
        (FINAL_CRITERIA_ORDER.get(b.key) ?? 99)
    );
  }
);

export async function updateFinalCriteria(
  criteria: FinalCriterion[]
): Promise<void> {
  const writes: BatchWrite[] = criteria.map((c) => ({
    type: 'set',
    path: `finalCriteria/${c.key}`,
    data: c as unknown as Record<string, any>,
  }));
  await commitBatch(writes);
}

export async function saveFinalRating(
  ideaId: string,
  jurorId: string,
  rating: FinalRating
): Promise<boolean> {
  try {
    await updateNestedField(`ideas/${ideaId}`, `finalRatings.${jurorId}`, rating);
    return true;
  } catch (error) {
    console.error('Error saving final rating:', {
      message: (error as any)?.message,
    });
    return false;
  }
}

export async function getFinalRatedIdeasForJuror(
  jurorId: string
): Promise<IdeaWithJurorFinalRating[]> {
  noStore();
  const ideas = await getIdeas();
  return ideas.map((idea) => {
    const { ratings, finalRatings, ...rest } = idea;
    return { ...rest, jurorFinalRating: (finalRatings ?? {})[jurorId] };
  });
}

export async function getIdeasWithFinalResults(): Promise<IdeaWithFinalTotals[]> {
  const [ideas, users, finalCriteria] = await Promise.all([
    getIdeas(),
    getUsers(),
    getFinalCriteria(),
  ]);
  const userMap = new Map(users.map((user) => [user.id, user]));

  return ideas
    .map((idea) => {
      const finalVoters = Object.keys(idea.finalRatings ?? {})
        .map((id) => userMap.get(id))
        .filter((u): u is User => !!u);
      return {
        ...idea,
        finalTotals: computeFinalTotals(idea.finalRatings, finalCriteria),
        finalVoters,
      };
    })
    .sort((a, b) => compareFinalTotals(a.finalTotals, b.finalTotals));
}

// ---------------------------------------------------------------------------
// Votación del público. Cada voto es un documento en publicVotes (id = voterId
// de la cookie) para evitar contención de escrituras sobre un doc caliente.
// ---------------------------------------------------------------------------

export type PublicVotingIdea = {
  id: string;
  name: string;
  postulante: string;
  area: string;
  imageUrl: string;
  codigo: string;
};

export type PublicVotingSnapshot = {
  open: boolean;
  ideas: PublicVotingIdea[];
};

// Cache en memoria por isolate para la página pública: cientos de asistentes
// cargando la lista al mismo tiempo no deben multiplicar las lecturas de
// Firestore (cada carga sin cache cuesta ~1 lectura por iniciativa). Los
// cambios (abrir/cerrar votación, ideas) se reflejan en máximo 30 segundos.
let publicVotingCache: { data: PublicVotingSnapshot; expiresAt: number } | null =
  null;
const PUBLIC_VOTING_CACHE_MS = 30_000;

export async function getPublicVotingSnapshot(): Promise<PublicVotingSnapshot> {
  if (publicVotingCache && Date.now() < publicVotingCache.expiresAt) {
    return publicVotingCache.data;
  }
  const [ideas, openDoc] = await Promise.all([
    listDocs<Idea>('ideas'),
    getDoc<{ open: boolean }>('config/publicVoting'),
  ]);
  const data: PublicVotingSnapshot = {
    open: openDoc?.open === true,
    ideas: ideas
      .filter((i) => i.active !== false)
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
      .map((i) => ({
        id: i.id,
        name: i.nombreSolucion || i.name,
        postulante: i.postulante ?? '',
        area: i.area ?? '',
        imageUrl: i.imageUrl ?? '',
        codigo: i.codigo ?? '',
      })),
  };
  publicVotingCache = { data, expiresAt: Date.now() + PUBLIC_VOTING_CACHE_MS };
  return data;
}

// Lectura fresca (sin cache de 30 s) del flag de apertura, para el admin.
export const getPublicVotingOpen = perRequest(async (): Promise<boolean> => {
  noStore();
  const doc = await getDoc<{ open: boolean }>('config/publicVoting');
  return doc?.open === true;
});

export async function setPublicVotingOpen(open: boolean): Promise<void> {
  await setDoc('config/publicVoting', { open });
  // Refresca el cache local; otros isolates expiran solos en <=30 s.
  publicVotingCache = null;
}

export async function getPublicVoteForVoter(
  voterId: string
): Promise<PublicVote | null> {
  return getDoc<PublicVote>(`publicVotes/${voterId}`);
}

// Registra el voto SOLO si el votante no había votado (creación atómica).
export async function createPublicVote(
  voterId: string,
  ideaId: string
): Promise<'created' | 'exists'> {
  const { createDoc } = await import('./firestore-rest');
  return createDoc('publicVotes', voterId, {
    ideaId,
    createdAt: new Date().toISOString(),
  });
}

export async function getPublicVotes(): Promise<PublicVote[]> {
  noStore();
  return listDocs<PublicVote>('publicVotes');
}

// Resultados públicos (panel para proyectar): total y solo el top 3.
// Cache en memoria de 15 s: muchos espectadores con auto-refresh no deben
// multiplicar las lecturas de la colección de votos.
export type PublicTopIdea = PublicVotingIdea & { votes: number; pct: number };

export type PublicResultsSnapshot = {
  total: number;
  top: PublicTopIdea[];
  // Las demás iniciativas (fuera del podio), ordenadas por votos, para
  // mostrar el panorama completo.
  others: PublicTopIdea[];
};

let publicResultsCache: {
  data: PublicResultsSnapshot;
  expiresAt: number;
} | null = null;
const PUBLIC_RESULTS_CACHE_MS = 15_000;

export async function getPublicResultsSnapshot(): Promise<PublicResultsSnapshot> {
  if (publicResultsCache && Date.now() < publicResultsCache.expiresAt) {
    return publicResultsCache.data;
  }
  const [votes, voting] = await Promise.all([
    listDocs<PublicVote>('publicVotes'),
    getPublicVotingSnapshot(),
  ]);
  const countByIdea = new Map<string, number>();
  for (const vote of votes) {
    countByIdea.set(vote.ideaId, (countByIdea.get(vote.ideaId) ?? 0) + 1);
  }
  const total = votes.length;
  const ranked = voting.ideas
    .map((idea) => ({
      ...idea,
      votes: countByIdea.get(idea.id) ?? 0,
      pct: total > 0 ? ((countByIdea.get(idea.id) ?? 0) / total) * 100 : 0,
    }))
    .sort((a, b) => b.votes - a.votes);
  const top = ranked.filter((i) => i.votes > 0).slice(0, 3);
  const topIds = new Set(top.map((i) => i.id));
  const others = ranked.filter((i) => !topIds.has(i.id));

  const data: PublicResultsSnapshot = { total, top, others };
  publicResultsCache = { data, expiresAt: Date.now() + PUBLIC_RESULTS_CACHE_MS };
  return data;
}

export async function deleteAllPublicVotes(): Promise<number> {
  const votes = await listDocs<PublicVote>('publicVotes');
  // Firestore acepta máximo 500 escrituras por commit: borramos por lotes.
  for (let i = 0; i < votes.length; i += 400) {
    const chunk = votes.slice(i, i + 400);
    await commitBatch(
      chunk.map((v) => ({ type: 'delete' as const, path: `publicVotes/${v.id}` }))
    );
  }
  publicResultsCache = null;
  return votes.length;
}

export const getRatingWeights = perRequest(
  async (): Promise<RatingWeights> => {
    noStore();
    const weights = await getDoc<RatingWeights>('config/ratingWeights');
    return weights ?? DEFAULT_FRENTE_WEIGHTS;
  }
);

export async function updateRatingWeights(weights: RatingWeights): Promise<void> {
  await setDoc('config/ratingWeights', weights as unknown as Record<string, any>);
}

export type { RatingWeights };

function normalizeScore(score: number, criterion: Criterion): number {
  const max = maxScoreFor(criterion);
  if (!max) return 0;
  return (score / max) * 100;
}

function computeFrenteScore(
  rating: Rating,
  frente: FrenteKey,
  criteria: Criterion[]
): number | null {
  const criteriaInFrente = criteria.filter((c) => c.frente === frente);
  if (criteriaInFrente.length === 0) return null;

  const present = criteriaInFrente.filter((c) => {
    const v = rating.scores?.[c.id];
    return typeof v === 'number' && v > 0;
  });
  if (present.length === 0) return null;

  let weightedSum = 0;
  let weightAccum = 0;
  for (const c of present) {
    const normalized = normalizeScore(rating.scores[c.id], c);
    weightedSum += (normalized * c.weight) / 100;
    weightAccum += c.weight;
  }
  if (weightAccum === 0) return null;
  return (weightedSum / weightAccum) * 100;
}

function calculateTotalScores(
  idea: Idea,
  weights: RatingWeights,
  voters: User[],
  criteria: Criterion[]
): IdeaWithTotals {
  const ratingsList = Object.values(idea.ratings ?? {});

  const perFrente = {} as Record<FrenteKey, FrenteScore>;
  for (const frente of FRENTES) {
    const values: number[] = [];
    for (const rating of ratingsList) {
      const s = computeFrenteScore(rating, frente.key, criteria);
      if (s !== null) values.push(s);
    }
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    perFrente[frente.key] = {
      raw: avg,
      weighted: (avg * weights[frente.key]) / 100,
      ratedCount: values.length,
    };
  }

  const weightedTotal = Object.values(perFrente).reduce(
    (sum, s) => sum + s.weighted,
    0
  );
  const rawTotal = Object.values(perFrente).reduce((sum, s) => sum + s.raw, 0);

  return {
    ...idea,
    totalScores: { porFrente: perFrente, rawTotal, weightedTotal },
    ratingCount: ratingsList.length,
    voters,
  };
}

export async function getIdeasWithResults(): Promise<IdeaWithTotals[]> {
  const [ideas, weights, users, criteria] = await Promise.all([
    getIdeas(),
    getRatingWeights(),
    getUsers(),
    getCriteria(),
  ]);
  const userMap = new Map(users.map((user) => [user.id, user]));

  return ideas
    .map((idea) => {
      const voterIds = Object.keys(idea.ratings ?? {});
      const voters = voterIds
        .map((id) => userMap.get(id))
        .filter((user): user is User => !!user);
      return calculateTotalScores(idea, weights, voters, criteria);
    })
    .sort((a, b) => b.totalScores.weightedTotal - a.totalScores.weightedTotal);
}

export type DetailedRating = {
  ideaName: string;
  jurorName: string;
  frentes: FrenteKey[];
  scores: Record<string, number>;
  observations?: string;
};

export async function getDetailedRatings(): Promise<DetailedRating[]> {
  noStore();
  const [ideas, users] = await Promise.all([getIdeas(), getUsers()]);
  const userMap = new Map(users.map((user) => [user.id, user]));

  const out: DetailedRating[] = [];
  for (const idea of ideas) {
    const ratings = idea.ratings ?? {};
    for (const jurorId in ratings) {
      const rating = ratings[jurorId];
      const juror = userMap.get(jurorId);
      out.push({
        ideaName: idea.name,
        jurorName: juror?.name ?? 'Unknown Juror',
        frentes: rating.evaluatedFrentes ?? [],
        scores: rating.scores ?? {},
        observations: rating.observations,
      });
    }
  }
  return out;
}

export async function getRatedIdeasForJuror(
  jurorId: string
): Promise<IdeaWithJurorRating[]> {
  noStore();
  const ideas = await getIdeas();

  return ideas.map((idea) => {
    const { ratings, ...ideaWithoutRatings } = idea;
    const jurorRating = (ratings ?? {})[jurorId];
    return { ...ideaWithoutRatings, jurorRating };
  });
}

export { SEED_CRITERIA as CRITERIA, CRITERIA_BY_ID, FRENTES };
