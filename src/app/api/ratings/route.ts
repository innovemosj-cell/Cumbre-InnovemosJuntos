// API Route para guardar calificaciones. Reemplaza al server action
// submitRating, que falla en CF Pages + next-on-pages con "An unexpected
// response was received from the server".
//
// Body JSON:
// { ideaId, jurorId, scores, evaluatedFrentes, observations }

import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getAppMode, getUserById, saveRating } from '@/lib/data';

export const runtime = 'edge';

const FRENTE_KEYS = ['estrategia', 'impacto', 'innovacion', 'tecnico'] as const;

const bodySchema = z.object({
  ideaId: z.string().min(1),
  jurorId: z.string().min(1),
  scores: z.record(z.string(), z.number().int().min(1).max(5)),
  observations: z.string().max(500).optional().or(z.literal('')),
  evaluatedFrentes: z.array(z.enum(FRENTE_KEYS)).min(1),
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
      console.error('[api/ratings] zod falló', {
        errors: parsed.error.errors.slice(0, 3),
      });
      return json(
        {
          error:
            'Los datos de la calificación no son válidos. Revisa los puntajes seleccionados.',
        },
        400
      );
    }

    const { ideaId, jurorId, scores, observations, evaluatedFrentes } =
      parsed.data;

    if (session.user.id !== jurorId) {
      return json(
        { error: 'No puedes calificar a nombre de otro jurado.' },
        403
      );
    }

    // Si el admin ya activó la evaluación final, no aceptamos más votos de
    // preselección (protege el histórico ante páginas abiertas antes del cambio).
    const mode = await getAppMode();
    if (mode !== 'preseleccion') {
      return json(
        {
          error:
            'La preselección ya cerró: la app está en modo Evaluación Final. Recarga la página.',
        },
        409
      );
    }

    // Re-leer del store por si el jurado fue desactivado tras login.
    // La sesión es un JWT que no consulta Firestore; sin esto, un jurado
    // desactivado con cookie aún viva podría seguir guardando ratings.
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

    const ok = await saveRating(ideaId, jurorId, {
      scores,
      observations: observations || '',
      evaluatedFrentes,
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
    console.error('[api/ratings] excepción:', {
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
