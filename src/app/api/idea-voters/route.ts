// Jurados que ya calificaron UNA iniciativa, para el botón "Actualizar" de
// la tarjeta "Jurados que han Votado" en el detalle de la iniciativa.
// Lecturas: 1 (doc de la idea, con máscara de los campos de votos) + 1 por
// cada jurado NUEVO que el navegador aún no conoce (parámetro `known`).

import { getSession } from '@/lib/session';
import { getDoc } from '@/lib/firestore-rest';
import type { FinalRating, Rating, User } from '@/lib/types';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (
      !session.isLoggedIn ||
      (session.user.role !== 'Admin' && session.user.role !== 'Organizer')
    ) {
      return Response.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const ideaId = url.searchParams.get('ideaId') ?? '';
    const mode =
      url.searchParams.get('mode') === 'preselection' ? 'preselection' : 'final';
    const known = new Set(
      (url.searchParams.get('known') ?? '').split(',').filter(Boolean)
    );
    if (!/^[\w-]+$/.test(ideaId)) {
      return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
    }

    const idea = await getDoc<{
      ratings?: Record<string, Rating>;
      finalRatings?: Record<string, FinalRating>;
    }>(`ideas/${ideaId}`, ['ratings', 'finalRatings']);
    if (!idea) {
      return Response.json({ error: 'Iniciativa no encontrada.' }, { status: 404 });
    }

    const voterIds = Object.keys(
      (mode === 'final' ? idea.finalRatings : idea.ratings) ?? {}
    );
    const newIds = voterIds.filter((id) => !known.has(id));
    const newVoters = (
      await Promise.all(
        newIds.map((id) =>
          getDoc<User>(`users/${id}`, ['name', 'email', 'avatarUrl'])
        )
      )
    )
      .filter((u): u is User => !!u)
      .map((u) => ({
        id: u.id,
        name: u.name ?? 'Jurado',
        email: u.email ?? '',
        avatarUrl: u.avatarUrl ?? '',
      }));

    return Response.json(
      { voterIds, newVoters },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch (e: any) {
    console.error('[api/idea-voters] error', {
      name: e?.name,
      message: e?.message,
    });
    return Response.json({ error: 'No se pudo actualizar.' }, { status: 500 });
  }
}
