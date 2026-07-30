// API Route para guardar la edición completa de una iniciativa (admin).
// Reemplaza al server action updateIdeaFullAction, que falla en CF Pages +
// next-on-pages: el POST de la action devuelve 404 y el cliente muere con
// "An unexpected response was received from the server".
//
// Body JSON: { ideaId, data: { nombreSolucion, problema, ... } }

import { z } from 'zod';
import { getSession } from '@/lib/session';
import { updateIdea } from '@/lib/data';

export const runtime = 'edge';

const fieldsSchema = z.object({
  nombreSolucion: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(200),
  postulante: z.string().trim().max(200).optional().or(z.literal('')),
  codigo: z.string().trim().max(40).optional().or(z.literal('')),
  group: z.string().trim().max(200).optional().or(z.literal('')),
  area: z.string().trim().max(200).optional().or(z.literal('')),
  problema: z.string().trim().max(4000).optional().or(z.literal('')),
  contextoActual: z.string().trim().max(4000).optional().or(z.literal('')),
  beneficiarios: z.string().trim().max(2000).optional().or(z.literal('')),
  relevancia: z.string().trim().max(2000).optional().or(z.literal('')),
  hipotesisIA: z.string().trim().max(4000).optional().or(z.literal('')),
  escenarioFuturo: z.string().trim().max(4000).optional().or(z.literal('')),
  indicadoresValor: z.string().trim().max(4000).optional().or(z.literal('')),
  eficienciaFTE: z
    .string()
    .trim()
    .max(150, 'Máximo 150 caracteres en Impacto en eficiencia.')
    .optional()
    .or(z.literal('')),
  detalleEficiencia: z.string().trim().max(8000).optional().or(z.literal('')),
  nivelMadurez: z.string().trim().max(4000).optional().or(z.literal('')),
  resumenEjecutivo: z.string().trim().max(8000).optional().or(z.literal('')),
  puntosFuertes: z.string().trim().max(8000).optional().or(z.literal('')),
  aspectosAMejorar: z.string().trim().max(8000).optional().or(z.literal('')),
  tecnologiasRecomendadas: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .or(z.literal('')),
  riesgo: z.string().trim().max(4000).optional().or(z.literal('')),
  manejaDatosSensibles: z.string().trim().max(4000).optional().or(z.literal('')),
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

const bodySchema = z.object({
  ideaId: z.string().min(1),
  data: fieldsSchema,
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
    if (session.user.role !== 'Admin') {
      return json({ error: 'No autorizado.' }, 403);
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return json(
        { error: 'No pudimos procesar los cambios. Intenta de nuevo.' },
        400
      );
    }

    const parsed = bodySchema.safeParse(payload);
    if (!parsed.success) {
      const firstError = Object.values(
        parsed.error.flatten().fieldErrors
      )[0]?.[0];
      console.error('[api/update-idea] zod falló', {
        errors: parsed.error.errors.slice(0, 3),
      });
      return json(
        { error: firstError ?? 'Los datos proporcionados son inválidos.' },
        400
      );
    }

    const { ideaId, data } = parsed.data;
    const partial: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        partial[key] = value;
      }
    }
    // Mantener `name` sincronizado con `nombreSolucion` (el listado usa ambos).
    if (typeof partial.nombreSolucion === 'string') {
      partial.name = partial.nombreSolucion;
    }

    await updateIdea(ideaId, partial);
    return json({ success: true, message: 'Iniciativa actualizada.' });
  } catch (e: any) {
    console.error('[api/update-idea] excepción:', {
      name: e?.name,
      message: e?.message,
      stack: e?.stack?.slice(0, 600),
    });
    return json(
      { error: 'No se pudo actualizar la iniciativa. Intenta de nuevo.' },
      500
    );
  }
}
