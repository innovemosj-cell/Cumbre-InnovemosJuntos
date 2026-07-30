'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// safeRevalidate: en CF Pages + next-on-pages, revalidatePath puede romper
// la respuesta del server action ("An unexpected response was received").
// Lo envolvemos en try/catch para que la action siempre responda.
// Los clientes deben hacer router.refresh() tras éxito para UI actualizada.
function safeRevalidate(path: string, type?: 'page' | 'layout') {
  try {
    if (type) (revalidatePath as any)(path, type);
    else revalidatePath(path);
  } catch (e) {
    console.warn('[revalidatePath] failed:', {
      path,
      error: (e as any)?.message,
    });
  }
}
import { newDocId } from './firestore-rest';
import {
  getUserByLoginCode,
  addIdea as addIdeaToDb,
  addUser,
  updateUser,
  UserCreate,
  getUserByEmail,
  updateIdea,
  deleteIdea,
  setCriterion,
  deleteCriterion,
  getCriteria,
  getCriterionById,
  resetAllRatings,
  resetAllFinalRatings,
  setPublicVotingOpen,
  deleteAllPublicVotes,
  updateRatingWeights,
  updateAppMode,
  updateFinalCriteria,
  getIdeaById,
  reorderIdeas,
} from '@/lib/data';
import type { FinalCriterion } from './final-criteria';
import type { AppMode, RatingWeights } from './types';
import type { Criterion } from './types';
import { createSession, getSession } from './session';
import { cookies } from 'next/headers';
import { buildPodcastScript } from './podcast-script';
import { synthesizeSpeech } from './google-tts';
import { uploadFile } from './firebase-storage';

// El cierre de sesión se hace vía /api/logout: el server action equivalente
// hacía POST a la página actual y en CF Pages fallaba (404) en rutas
// dinámicas ([id]), dejando la cookie de sesión sin borrar.

const loginWithCodeSchema = z.object({
  loginCode: z
    .string()
    .length(4, 'El código debe tener 4 dígitos.')
    .regex(/^\d{4}$/, 'El código solo puede contener números.'),
});

export async function handleLoginWithCode(prevState: any, formData: FormData) {
  // Delay artificial mínimo para suavizar timing attacks y dar feedback
  // visual de "validando". Confiamos en Cloudflare Rate Limiting para
  // mitigar brute force a 10K combinaciones del código de 4 dígitos.
  await new Promise((r) => setTimeout(r, 200));

  const rawData = Object.fromEntries(formData.entries());
  const parseResult = loginWithCodeSchema.safeParse(rawData);

  if (!parseResult.success) {
    return { message: 'El código de acceso es inválido.' };
  }

  const { loginCode } = parseResult.data;

  try {
    const user = await getUserByLoginCode(loginCode);

    if (!user) {
      return { message: 'El código de acceso no es válido.' };
    }

    if ((user.role === 'Jurado' || user.role === 'Equipo') && user.active === false) {
      return {
        message:
          'Tu cuenta está desactivada. Contacta al administrador del hackathon.',
      };
    }

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    const session = await createSession({ user, expires });
    (await cookies()).set('session', session, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  } catch (error: any) {
    console.error('[handleLoginWithCode] error:', {
      message: error?.message,
      name: error?.name,
    });
    return { message: 'Ocurrió un error inesperado al iniciar sesión.' };
  }

  // El layout redirige a los Equipos a /mi-iniciativa; entramos por /dashboard
  // para no depender del rol aquí.
  redirect('/dashboard');
}

const ideaFormSchema = z.object({
  nombreSolucion: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  postulante: z.string().optional().or(z.literal('')),
  group: z.string().min(2, 'El grupo es obligatorio.'),
  area: z.string().min(2, 'El área es obligatoria.'),
  problema: z.string().min(20, 'El problema debe tener al menos 20 caracteres.'),
  hipotesisIA: z.string().optional().or(z.literal('')),
  indicadoresValor: z.string().optional().or(z.literal('')),
  eficienciaFTE: z
    .string()
    .max(150, 'Máximo 150 caracteres.')
    .optional()
    .or(z.literal('')),
});

export async function addIndividualIdea(data: unknown) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false, message: 'No autorizado.' };
  }

  const parseResult = ideaFormSchema.safeParse(data);
  if (!parseResult.success) {
    const firstError = Object.values(
      parseResult.error.flatten().fieldErrors
    )[0]?.[0];
    return {
      success: false,
      message: firstError || 'Los datos proporcionados son inválidos.',
    };
  }

  try {
    const d = parseResult.data;
    const slug = d.nombreSolucion
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const ideaData = {
      codigo: '',
      name: d.nombreSolucion,
      nombreSolucion: d.nombreSolucion,
      postulante: d.postulante || '',
      group: d.group,
      area: d.area,
      description: '',
      problema: d.problema,
      hipotesisIA: d.hipotesisIA || '',
      indicadoresValor: d.indicadoresValor || '',
      eficienciaFTE: d.eficienciaFTE || '',
      imageUrl: `https://picsum.photos/seed/${slug || Date.now()}/600/400`,
      active: true,
    };
    await addIdeaToDb(ideaData);
    safeRevalidate('/admin/iniciativas');
    safeRevalidate('/dashboard');
    return { success: true, message: 'Iniciativa creada correctamente.' };
  } catch (error: any) {
    console.error('Error adding idea:', { message: error?.message });
    return {
      success: false,
      message: 'No se pudo crear la iniciativa. Intenta de nuevo.',
    };
  }
}

const ratingWeightsSchema = z
  .object({
    estrategia: z.coerce.number().min(0).max(100),
    impacto: z.coerce.number().min(0).max(100),
    innovacion: z.coerce.number().min(0).max(100),
    tecnico: z.coerce.number().min(0).max(100),
  })
  .refine(
    (w) =>
      Math.abs(w.estrategia + w.impacto + w.innovacion + w.tecnico - 100) <
      0.0001,
    { message: 'Los cuatro pesos deben sumar exactamente 100.' }
  );

export async function updateRatingWeightsAction(data: unknown) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false, message: 'No autorizado.' };
  }

  const parsed = ratingWeightsSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.';
    return { success: false, message: first };
  }

  try {
    await updateRatingWeights(parsed.data as RatingWeights);
    safeRevalidate('/admin/criterios');
    safeRevalidate('/organizer');
    safeRevalidate('/my-results');
    return {
      success: true,
      message: 'Pesos actualizados correctamente.',
      data: parsed.data,
    };
  } catch (error: any) {
    console.error('updateRatingWeights error:', { message: error?.message });
    return {
      success: false,
      message: 'No se pudieron guardar los pesos. Intenta de nuevo.',
    };
  }
}

const appModeSchema = z.object({
  mode: z.enum(['preseleccion', 'final']),
});

export async function updateAppModeAction(data: unknown) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false as const, message: 'No autorizado.' };
  }

  const parsed = appModeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, message: 'Datos inválidos.' };
  }

  try {
    await updateAppMode(parsed.data.mode as AppMode);
    safeRevalidate('/admin/criterios');
    safeRevalidate('/dashboard');
    safeRevalidate('/organizer');
    safeRevalidate('/my-results');
    return {
      success: true as const,
      message:
        parsed.data.mode === 'final'
          ? 'Modo Evaluación Final activado. Los jurados ahora califican con estrellas.'
          : 'Modo Preselección activado. Los jurados califican con los criterios por frente.',
      mode: parsed.data.mode as AppMode,
    };
  } catch (error: any) {
    console.error('updateAppMode error:', { message: error?.message });
    return {
      success: false as const,
      message: 'No se pudo cambiar el modo. Intenta de nuevo.',
    };
  }
}

const finalStarMeaningSchema = z.object({
  stars: z.coerce.number().int().min(1).max(5),
  label: z.string().trim().min(1, 'El nombre del nivel es obligatorio.').max(80),
  description: z
    .string()
    .trim()
    .min(1, 'La descripción de cada estrella es obligatoria.')
    .max(400),
});

const finalCriterionSchema = z.object({
  key: z.enum(['originality', 'scalability', 'impact', 'demo', 'clarity']),
  label: z.string().trim().min(3, 'El título del criterio es muy corto.').max(120),
  weight: z.coerce.number().min(0).max(100),
  question: z.string().trim().min(5, 'La pregunta es muy corta.').max(800),
  starMeanings: z
    .array(finalStarMeaningSchema)
    .length(5, 'Cada criterio debe tener las 5 estrellas.'),
});

const finalCriteriaSchema = z
  .array(finalCriterionSchema)
  .length(5, 'Deben ser los 5 criterios de la evaluación final.')
  .refine(
    (list) => new Set(list.map((c) => c.key)).size === 5,
    'Hay criterios repetidos.'
  )
  .refine(
    (list) => Math.abs(list.reduce((s, c) => s + c.weight, 0) - 100) < 0.0001,
    'Los pesos de los 5 criterios deben sumar exactamente 100.'
  )
  .refine(
    (list) =>
      list.every(
        (c) =>
          new Set(c.starMeanings.map((m) => m.stars)).size === 5
      ),
    'Cada criterio debe tener una aclaración por estrella (1 a 5), sin repetir.'
  );

export async function updateFinalCriteriaAction(data: unknown) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false as const, message: 'No autorizado.' };
  }

  const parsed = finalCriteriaSchema.safeParse(data);
  if (!parsed.success) {
    const first =
      parsed.error.errors[0]?.message ?? 'Los datos son inválidos.';
    return { success: false as const, message: first };
  }

  try {
    const criteria: FinalCriterion[] = parsed.data.map((c) => ({
      key: c.key,
      label: c.label,
      weight: c.weight,
      question: c.question,
      starMeanings: [...c.starMeanings].sort((a, b) => a.stars - b.stars),
    }));
    await updateFinalCriteria(criteria);
    safeRevalidate('/admin/criterios');
    safeRevalidate('/organizer');
    safeRevalidate('/my-results');
    return {
      success: true as const,
      message: 'Criterios de la evaluación final guardados.',
    };
  } catch (error: any) {
    console.error('updateFinalCriteria error:', { message: error?.message });
    return {
      success: false as const,
      message: 'No se pudieron guardar los criterios. Intenta de nuevo.',
    };
  }
}

async function generatePodcastFor(ideaId: string): Promise<string> {
  const idea = await getIdeaById(ideaId);
  if (!idea) throw new Error('Iniciativa no encontrada.');
  const script = buildPodcastScript(idea);
  if (!script.trim()) {
    throw new Error('La iniciativa no tiene contenido para leer.');
  }
  const { audio, mimeType } = await synthesizeSpeech(script);
  const extension = mimeType === 'audio/wav' ? 'wav' : 'mp3';
  const { url } = await uploadFile(
    `podcasts/${ideaId}.${extension}`,
    audio,
    mimeType
  );
  // Cache-buster con timestamp para evitar caches viejos del navegador.
  const audioUrl = `${url}&v=${Date.now()}`;
  const audioGeneratedAt = new Date().toISOString();
  await updateIdea(ideaId, { audioUrl, audioGeneratedAt });
  return audioUrl;
}

export async function regeneratePodcastAction(ideaId: string) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false, message: 'No autorizado.' };
  }
  try {
    const audioUrl = await generatePodcastFor(ideaId);
    safeRevalidate('/admin/iniciativas');
    safeRevalidate(`/ideas/${ideaId}`);
    return {
      success: true,
      message: 'Audio generado correctamente.',
      audioUrl,
    };
  } catch (error: any) {
    console.error('[regeneratePodcastAction] error:', {
      ideaId,
      message: error?.message,
    });
    return {
      success: false,
      message: error?.message ?? 'No se pudo generar el audio.',
    };
  }
}

export async function resetAllRatingsAction(confirmation: string) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false, message: 'No autorizado.' };
  }
  if (confirmation !== 'REINICIAR') {
    return {
      success: false,
      message: 'La confirmación no coincide. Debe escribir REINICIAR.',
    };
  }
  try {
    const count = await resetAllRatings();
    safeRevalidate('/admin/iniciativas');
    safeRevalidate('/dashboard');
    safeRevalidate('/organizer');
    safeRevalidate('/my-results');
    return {
      success: true,
      message:
        count === 0
          ? 'No hay iniciativas para reiniciar.'
          : `Se reiniciaron los votos de ${count} iniciativa${count === 1 ? '' : 's'}.`,
    };
  } catch (error: any) {
    console.error('resetAllRatings error:', { message: error?.message });
    return {
      success: false,
      message: 'No se pudieron reiniciar los votos. Intenta de nuevo.',
    };
  }
}

export async function resetAllFinalRatingsAction(confirmation: string) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false, message: 'No autorizado.' };
  }
  if (confirmation !== 'BORRAR') {
    return {
      success: false,
      message: 'La confirmación no coincide. Debe escribir BORRAR.',
    };
  }
  try {
    const count = await resetAllFinalRatings();
    safeRevalidate('/admin/iniciativas');
    safeRevalidate('/dashboard');
    safeRevalidate('/organizer');
    safeRevalidate('/my-results');
    return {
      success: true,
      message:
        count === 0
          ? 'No hay iniciativas para reiniciar.'
          : `Se borraron los votos de la evaluación final de ${count} iniciativa${count === 1 ? '' : 's'}. Los votos de preselección quedaron intactos.`,
    };
  } catch (error: any) {
    console.error('resetAllFinalRatings error:', { message: error?.message });
    return {
      success: false,
      message:
        'No se pudieron borrar los votos de la evaluación final. Intenta de nuevo.',
    };
  }
}

export async function setPublicVotingOpenAction(open: boolean) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false as const, message: 'No autorizado.' };
  }
  try {
    await setPublicVotingOpen(open === true);
    safeRevalidate('/admin/votacion');
    safeRevalidate('/votacion');
    return {
      success: true as const,
      message: open
        ? 'Votación del público abierta. Puede tardar hasta 30 segundos en reflejarse para los asistentes.'
        : 'Votación del público cerrada. Puede tardar hasta 30 segundos en reflejarse para los asistentes.',
      open: open === true,
    };
  } catch (error: any) {
    console.error('setPublicVotingOpen error:', { message: error?.message });
    return {
      success: false as const,
      message: 'No se pudo cambiar el estado de la votación. Intenta de nuevo.',
    };
  }
}

export async function deleteAllPublicVotesAction(confirmation: string) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false, message: 'No autorizado.' };
  }
  if (confirmation !== 'BORRAR') {
    return {
      success: false,
      message: 'La confirmación no coincide. Debe escribir BORRAR.',
    };
  }
  try {
    const count = await deleteAllPublicVotes();
    safeRevalidate('/admin/votacion');
    return {
      success: true,
      message:
        count === 0
          ? 'No había votos del público para borrar.'
          : `Se borraron ${count} voto${count === 1 ? '' : 's'} del público.`,
    };
  } catch (error: any) {
    console.error('deleteAllPublicVotes error:', { message: error?.message });
    return {
      success: false,
      message: 'No se pudieron borrar los votos del público. Intenta de nuevo.',
    };
  }
}

export async function toggleIdeaActiveAction(ideaId: string, active: boolean) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false, message: 'No autorizado.' };
  }
  try {
    await updateIdea(ideaId, { active });
    safeRevalidate('/admin/iniciativas');
    safeRevalidate('/dashboard');
    safeRevalidate(`/ideas/${ideaId}`);
    return {
      success: true,
      message: active
        ? 'Iniciativa activada.'
        : 'Iniciativa desactivada (los jurados ya no la verán).',
    };
  } catch (error: any) {
    console.error('toggleIdeaActive error:', { message: error?.message });
    return {
      success: false,
      message: 'No se pudo actualizar la iniciativa. Intenta de nuevo.',
    };
  }
}

const FRENTE_ENUM = z.enum(['estrategia', 'impacto', 'innovacion', 'tecnico']);

const criterionLevelSchema = z.object({
  score: z.coerce.number().int().min(1).max(99),
  label: z.string().min(1, 'El nombre del nivel es obligatorio.').max(80),
  description: z.string().max(400).optional().or(z.literal('')),
});

const criterionSchema = z.object({
  id: z
    .string()
    .min(2, 'El id es obligatorio.')
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones.')
    .max(60),
  key: z.string().min(1).max(60),
  frente: FRENTE_ENUM,
  label: z.string().min(3, 'Etiqueta muy corta.').max(120),
  description: z.string().min(5, 'Descripción muy corta.').max(800),
  weight: z.coerce.number().min(0).max(100),
  order: z.coerce.number().int().min(0).max(999),
  levels: z
    .array(criterionLevelSchema)
    .min(2, 'Debe tener al menos 2 niveles.')
    .max(7, 'Máximo 7 niveles.'),
});

export async function upsertCriterionAction(data: unknown, originalId?: string) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false, message: 'No autorizado.' };
  }

  const parseResult = criterionSchema.safeParse(data);
  if (!parseResult.success) {
    const firstError = Object.values(
      parseResult.error.flatten().fieldErrors
    )[0]?.[0];
    return {
      success: false,
      message: firstError || 'Los datos del criterio son inválidos.',
    };
  }

  const parsed = parseResult.data;
  const scores = parsed.levels.map((l) => l.score);
  if (new Set(scores).size !== scores.length) {
    return {
      success: false,
      message: 'Los puntajes de los niveles deben ser únicos.',
    };
  }

  try {
    // Preservar campos opcionales (ej. infoHelp) del doc existente,
    // ya que el form de admin no los expone y setDoc reemplaza el documento.
    const existing = originalId
      ? await getCriterionById(originalId)
      : await getCriterionById(parsed.id);

    const criterion: Criterion = {
      id: parsed.id,
      key: parsed.key || parsed.id.replace(/-/g, '_'),
      frente: parsed.frente,
      label: parsed.label,
      description: parsed.description,
      weight: parsed.weight,
      order: parsed.order,
      levels: parsed.levels
        .map((l) => ({
          score: l.score,
          label: l.label,
          description: l.description ?? '',
        }))
        .sort((a, b) => a.score - b.score),
      ...(existing?.infoHelp ? { infoHelp: existing.infoHelp } : {}),
    };

    if (originalId && originalId !== criterion.id) {
      await deleteCriterion(originalId);
    }
    await setCriterion(criterion);

    safeRevalidate('/admin/criterios');
    safeRevalidate('/admin/settings');
    safeRevalidate('/organizer');
    return { success: true, message: 'Criterio guardado.' };
  } catch (error: any) {
    console.error('upsertCriterion error:', { message: error?.message });
    return {
      success: false,
      message: 'No se pudo guardar el criterio. Intenta de nuevo.',
    };
  }
}

export async function deleteCriterionAction(id: string) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false, message: 'No autorizado.' };
  }
  try {
    const all = await getCriteria();
    if (all.length <= 1) {
      return {
        success: false,
        message: 'No puedes eliminar el último criterio.',
      };
    }
    await deleteCriterion(id);
    safeRevalidate('/admin/criterios');
    safeRevalidate('/organizer');
    return {
      success: true,
      message:
        'Criterio eliminado. Las calificaciones existentes lo ignorarán en los totales.',
    };
  } catch (error: any) {
    console.error('deleteCriterion error:', { message: error?.message });
    return {
      success: false,
      message: 'No se pudo eliminar el criterio. Intenta de nuevo.',
    };
  }
}

export async function deleteIdeaAction(ideaId: string) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false, message: 'No autorizado.' };
  }
  try {
    await deleteIdea(ideaId);
    safeRevalidate('/admin/iniciativas');
    safeRevalidate('/dashboard');
    return { success: true, message: 'Iniciativa eliminada.' };
  } catch (error: any) {
    console.error('deleteIdea error:', { message: error?.message });
    return {
      success: false,
      message: 'No se pudo eliminar la iniciativa. Intenta de nuevo.',
    };
  }
}

import { createUserFormSchema } from './schemas';

export async function createUserAction(data: unknown) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false, message: 'No autorizado.' };
  }

  const parseResult = createUserFormSchema.safeParse(data);
  if (!parseResult.success) {
    const firstError = Object.values(
      parseResult.error.flatten().fieldErrors
    )[0]?.[0];
    return {
      success: false,
      message: firstError || 'Los datos proporcionados son inválidos.',
    };
  }

  const {
    email,
    name,
    role,
    avatarUrl,
    loginCode,
    frentesAEvaluar,
    rolOrganizacion,
    teamIdeaId,
  } = parseResult.data;

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return {
        success: false,
        message: 'Ya existe un usuario con este correo electrónico.',
      };
    }

    if (role === 'Equipo') {
      if (!teamIdeaId) {
        return {
          success: false,
          message: 'Debes asignar una iniciativa al usuario Equipo.',
        };
      }
      const idea = await getIdeaById(teamIdeaId);
      if (!idea) {
        return {
          success: false,
          message: 'La iniciativa asignada no existe.',
        };
      }
    }

    const newUserId = newDocId();

    const newUser: UserCreate = {
      id: newUserId,
      name,
      email,
      role,
      avatarUrl:
        avatarUrl || `https://picsum.photos/seed/${newUserId}/40/40`,
      loginCode: loginCode || '',
      frentesAEvaluar: role === 'Jurado' ? (frentesAEvaluar ?? []) : undefined,
      ...(role === 'Jurado' && rolOrganizacion
        ? { rolOrganizacion }
        : {}),
      ...(role === 'Equipo' && teamIdeaId ? { teamIdeaId } : {}),
      ...(role === 'Equipo' ? { active: true } : {}),
    };
    await addUser(newUser);

    safeRevalidate('/(app)/admin/users', 'page');
    return { success: true, message: 'Usuario creado correctamente.' };
  } catch (error: any) {
    console.error('Error creating user in Firestore:', { message: error?.message });
    return {
      success: false,
      message: 'No se pudo crear el usuario. Intenta de nuevo.',
    };
  }
}

const updateUserFormSchema = z.object({
  role: z.enum(['Admin', 'Jurado', 'Organizer', 'Equipo']).optional(),
  loginCode: z.string().length(4).optional(),
  frentesAEvaluar: z
    .array(z.enum(['estrategia', 'impacto', 'innovacion', 'tecnico']))
    .optional(),
  teamIdeaId: z.string().optional().or(z.literal('')),
});

export async function updateUserAction(userId: string, data: unknown) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false, message: 'No autorizado.' };
  }

  const parseResult = updateUserFormSchema.safeParse(data);
  if (!parseResult.success) {
    return {
      success: false,
      message: 'Los datos proporcionados son inválidos.',
    };
  }

  try {
    await updateUser(userId, parseResult.data);
    safeRevalidate('/(app)/admin/users', 'page');
    return {
      success: true,
      message: 'Usuario actualizado correctamente.',
      data: parseResult.data,
    };
  } catch (error: any) {
    console.error('Error updating user:', { message: error?.message });
    return {
      success: false,
      message: 'No se pudo actualizar el usuario. Intenta de nuevo.',
    };
  }
}

const updateIdeaImageSchema = z.object({
  imageUrl: z
    .string()
    .trim()
    .max(1024, 'La URL es demasiado larga.')
    .refine(
      (v) => v === '' || /^https?:\/\//i.test(v),
      'La URL debe empezar con http:// o https://'
    ),
});

export async function updateIdeaImageAction(ideaId: string, data: unknown) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false as const, message: 'No autorizado.' };
  }

  const parsed = updateIdeaImageSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message;
    return {
      success: false as const,
      message: firstError ?? 'Datos inválidos.',
    };
  }

  try {
    await updateIdea(ideaId, { imageUrl: parsed.data.imageUrl });
    safeRevalidate('/(app)/admin/iniciativas', 'page');
    safeRevalidate('/dashboard');
    safeRevalidate(`/ideas/${ideaId}`);
    return {
      success: true as const,
      message: parsed.data.imageUrl
        ? 'Foto del equipo actualizada.'
        : 'Foto del equipo eliminada.',
      imageUrl: parsed.data.imageUrl,
    };
  } catch (error: any) {
    console.error('updateIdeaImage error:', { message: error?.message });
    return {
      success: false as const,
      message: 'No se pudo actualizar la foto. Intenta de nuevo.',
    };
  }
}

const setJurorActiveSchema = z.object({
  active: z.boolean(),
});

export async function setJurorActiveAction(userId: string, data: unknown) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false as const, message: 'No autorizado.' };
  }

  const parsed = setJurorActiveSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, message: 'Datos inválidos.' };
  }

  try {
    const { getUserById } = await import('./data');
    const target = await getUserById(userId);
    if (!target) {
      return { success: false as const, message: 'Usuario no encontrado.' };
    }
    if (target.role !== 'Jurado' && target.role !== 'Equipo') {
      return {
        success: false as const,
        message: 'Solo se puede activar o desactivar a Jurados o Equipos.',
      };
    }

    await updateUser(userId, { active: parsed.data.active });
    safeRevalidate('/(app)/admin/users', 'page');
    const label = target.role === 'Equipo' ? 'Equipo' : 'Jurado';
    return {
      success: true as const,
      message: parsed.data.active
        ? `${label} activado.`
        : `${label} desactivado. No podrá ingresar hasta volver a activarlo.`,
      active: parsed.data.active,
    };
  } catch (error: any) {
    console.error('setJurorActive error:', { message: error?.message });
    return {
      success: false as const,
      message: 'No se pudo actualizar el estado del jurado. Intenta de nuevo.',
    };
  }
}

// Las funciones downloadResultsAsCsv y downloadDetailedRatingsAsCsv se
// removieron: la descarga ahora la hace el endpoint /api/export-evaluaciones

const reorderIdeasSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, 'La lista no puede estar vacía.')
    .max(500, 'Demasiadas iniciativas.'),
});

export async function reorderIdeasAction(data: unknown) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'Admin') {
    return { success: false as const, message: 'No autorizado.' };
  }

  const parsed = reorderIdeasSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, message: 'Datos inválidos.' };
  }

  const uniqueIds = new Set(parsed.data.ids);
  if (uniqueIds.size !== parsed.data.ids.length) {
    return { success: false as const, message: 'Hay ids duplicados en la lista.' };
  }

  try {
    await reorderIdeas(parsed.data.ids);
    safeRevalidate('/(app)/admin/iniciativas', 'page');
    safeRevalidate('/dashboard');
    return { success: true as const, message: 'Orden actualizado.' };
  } catch (error: any) {
    console.error('reorderIdeas error:', { message: error?.message });
    return {
      success: false as const,
      message: 'No se pudo guardar el nuevo orden. Intenta de nuevo.',
    };
  }
}

// La edición completa de la iniciativa (admin) se guarda vía
// /api/update-idea: el server action equivalente fallaba en CF Pages +
// next-on-pages (POST 404 → "unexpected response" en el cliente).

// Campos que el propio equipo puede editar sobre su iniciativa.
// Se limita al subconjunto que ve el jurado, sin análisis interno.
const updateMyIdeaSchema = z.object({
  nombreSolucion: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(200),
  problema: z.string().trim().max(4000).optional().or(z.literal('')),
  hipotesisIA: z.string().trim().max(4000).optional().or(z.literal('')),
  indicadoresValor: z.string().trim().max(4000).optional().or(z.literal('')),
  eficienciaFTE: z
    .string()
    .trim()
    .max(150, 'Máximo 150 caracteres.')
    .optional()
    .or(z.literal('')),
  riesgo: z.string().trim().max(4000).optional().or(z.literal('')),
  manejaDatosSensibles: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .or(z.literal('')),
  distribucionValor: z.string().trim().max(4000).optional().or(z.literal('')),
  imageUrl: z
    .string()
    .trim()
    .max(1024)
    .refine(
      (v) => v === '' || /^https?:\/\//i.test(v),
      'La URL de la foto debe empezar con http:// o https://'
    )
    .optional()
    .or(z.literal('')),
});

export async function updateMyIdeaAction(data: unknown) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return { success: false as const, message: 'No autorizado.' };
  }
  const user = session.user;
  if (user.role !== 'Equipo') {
    return { success: false as const, message: 'No autorizado.' };
  }
  if (user.active === false) {
    return {
      success: false as const,
      message:
        'Tu acceso está pausado. Contacta al administrador del hackathon.',
    };
  }
  if (!user.teamIdeaId) {
    return {
      success: false as const,
      message: 'Tu usuario no tiene una iniciativa asignada.',
    };
  }

  const parsed = updateMyIdeaSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return {
      success: false as const,
      message: firstError ?? 'Los datos proporcionados son inválidos.',
    };
  }

  try {
    const partial: Record<string, any> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (typeof value === 'string') {
        partial[key] = value;
      }
    }
    if (typeof partial.nombreSolucion === 'string') {
      partial.name = partial.nombreSolucion;
    }
    await updateIdea(user.teamIdeaId, partial);
    safeRevalidate('/mi-iniciativa');
    safeRevalidate(`/ideas/${user.teamIdeaId}`);
    safeRevalidate('/dashboard');
    return {
      success: true as const,
      message: 'Cambios guardados. Así lo verán los jurados.',
    };
  } catch (error: any) {
    console.error('updateMyIdea error:', { message: error?.message });
    return {
      success: false as const,
      message: 'No se pudieron guardar los cambios. Intenta de nuevo.',
    };
  }
}