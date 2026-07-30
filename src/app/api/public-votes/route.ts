// API pública para la votación del público (sin sesión).
//
// POST { ideaId } — registra el voto del asistente:
// - La identidad del votante es una cookie httpOnly (publicVoterId, UUID).
// - El voto se crea de forma ATÓMICA (create-if-not-exists): un doc por
//   votante en publicVotes. Un segundo intento devuelve 409 "ya votaste",
//   incluso con doble clic o dos pestañas.
// - Solo acepta votos con la votación abierta y por iniciativas activas
//   (validado contra el snapshot cacheado: ~0 lecturas extra por voto).

import { z } from 'zod';
import {
  createPublicVote,
  getPublicVotingSnapshot,
} from '@/lib/data';

export const runtime = 'edge';

const COOKIE_NAME = 'publicVoterId';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

const bodySchema = z.object({
  ideaId: z.string().min(1).max(200),
});

function json(data: any, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });
}

function readVoterCookie(req: Request): string | null {
  const raw = req.headers.get('cookie') ?? '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  const value = match?.[1] ?? '';
  // UUID v4 esperado; cualquier otra cosa se descarta.
  return /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

function voterCookieHeader(voterId: string): Record<string, string> {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return {
    'set-cookie': `${COOKIE_NAME}=${voterId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
  };
}

export async function POST(req: Request) {
  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return json({ error: 'No pudimos procesar tu voto. Intenta de nuevo.' }, 400);
    }

    const parsed = bodySchema.safeParse(payload);
    if (!parsed.success) {
      return json({ error: 'El voto no es válido.' }, 400);
    }

    const snapshot = await getPublicVotingSnapshot();
    if (!snapshot.open) {
      return json(
        { error: 'La votación no está abierta en este momento.' },
        403
      );
    }

    const idea = snapshot.ideas.find((i) => i.id === parsed.data.ideaId);
    if (!idea) {
      return json({ error: 'La iniciativa no está disponible para votar.' }, 400);
    }

    const voterId = readVoterCookie(req) ?? crypto.randomUUID();
    const result = await createPublicVote(voterId, idea.id);
    const cookie = voterCookieHeader(voterId);

    if (result === 'exists') {
      return json(
        { error: 'Ya registraste tu voto. Solo se permite un voto por persona.' },
        409,
        cookie
      );
    }

    return json({ success: true, ideaId: idea.id }, 200, cookie);
  } catch (e: any) {
    console.error('[api/public-votes] excepción:', {
      name: e?.name,
      message: e?.message,
    });
    return json(
      { error: 'Ocurrió un error al registrar tu voto. Intenta de nuevo.' },
      500
    );
  }
}
