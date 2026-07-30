// API Route para guardar calificaciones de la EVALUACIÓN FINAL (estrellas).
// Se usa API Route (no server action) por el mismo bug de CF Pages +
// next-on-pages que afecta a /api/ratings.
//
// Body JSON:
// { ideaId, jurorId, scores: { originality, scalability, impact, demo, clarity }, observations }

import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getAppMode, getUserById, saveFinalRating } from '@/lib/data';
import { FINAL_OBSERVATIONS_MAX } from '@/lib/final-criteria';

export const runtime = 'edge';

const starSchema = z.number().int().min(1).max(5);

const bodySchema = z.object({
  ideaId: z.string().min(1),
  jurorId: z.string().min(1),
  scores: z.object({
    originality: starSchema,
    scalability: starSchema,
    impact: starSchema,
    demo: starSchema,
    clarity: starSchema,
  }),
  observations: z
    .string()
    .max(FINAL_OBSERVATIONS_MAX)
    .optional()
    .or(z.literal('')),
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return json({ error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }, 401);
    }
    if (session.user.role !== 'Jurado') {
      return json(
        { error: 'Solo los jurados pueden enviar calificaciones.' },
        403
      );
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return json(
        { error: 'No pudimos procesar tu calificación. Intenta de nuevo.' },
        400
      );
    }

    const parsed = bodySchema.safeParse(payload);
    if (!parsed.success) {
      console.error('[api/final-ratings] zod falló', {
        errors: parsed.error.errors.slice(0, 3),
      });
      return json(
        {
          error:
            'Los datos de la calificación no son válidos. Revisa las estrellas seleccionadas.',
        },
        400
      );
    }

    const { ideaId, jurorId, scores, observations } = parsed.data;

    if (session.user.id !== jurorId) {
      return json(
        { error: 'No puedes calificar a nombre de otro jurado.' },
        403
      );
    }

    // La evaluación final solo acepta votos mientras el modo esté activo,
    // para evitar escrituras cruzadas desde páginas abiertas antes del cambio.
    const mode = await getAppMode();
    if (mode !== 'final') {
      return json(
        {
          error:
            'La evaluación final no está activa en este momento. Recarga la página.',
        },
        409
      );
    }

    // Re-leer del store por si el jurado fue desactivado tras login.
    const fresh = await getUserById(jurorId);
    if (!fresh || fresh.active === false) {
      return json(
        {
          error:
            'Tu cuenta está desactivada. Contacta al administrador del hackathon.',
        },
        403
      );
    }

    const ok = await saveFinalRating(ideaId, jurorId, {
      scores,
      observations: observations || '',
      updatedAt: new Date().toISOString(),
    });

    if (!ok) {
      return json(
        { error: 'No se pudo guardar la calificación. Intenta de nuevo.' },
        500
      );
    }

    return json({ success: true });
  } catch (e: any) {
    console.error('[api/final-ratings] excepción:', {
      name: e?.name,
      message: e?.message,
      stack: e?.stack?.slice(0, 600),
    });
    return json(
      { error: 'Ocurrió un error al guardar la calificación. Intenta de nuevo.' },
      500
    );
  }
}
