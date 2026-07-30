// Snapshot mínimo para el botón "Actualizar" del panel del organizador:
// lee SOLO la colección ideas con proyección del campo finalRatings
// (~1 lectura por iniciativa) en lugar de recargar toda la página
// (ideas + users + finalCriteria). El navegador recalcula el ranking con
// los criterios y jurados que ya tiene.

import { getSession } from '@/lib/session';
import { runQuery } from '@/lib/firestore-rest';
import type { FinalRating } from '@/lib/types';

export const runtime = 'edge';

export async function GET() {
  try {
    const session = await getSession();
    if (
      !session.isLoggedIn ||
      (session.user.role !== 'Admin' && session.user.role !== 'Organizer')
    ) {
      return Response.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const rows = await runQuery<{
      id: string;
      finalRatings?: Record<string, FinalRating>;
    }>({
      from: [{ collectionId: 'ideas' }],
      select: { fields: [{ fieldPath: 'finalRatings' }] },
    });

    return Response.json(
      {
        ideas: rows.map((r) => ({
          id: r.id,
          finalRatings: r.finalRatings ?? {},
        })),
      },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch (e: any) {
    console.error('[api/final-results] error', {
      name: e?.name,
      message: e?.message,
    });
    return Response.json(
      { error: 'No se pudo actualizar.' },
      { status: 500 }
    );
  }
}
