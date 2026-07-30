// Borra un perfil de usuario (solo Admin). API Route en vez de Server
// Action por el bug de @cloudflare/next-on-pages en CF Pages.
// Lecturas: 1 (el doc del usuario, para validar que existe). Escrituras: 1.
// Nota: NO toca los votos ya emitidos por el usuario (quedan guardados en
// los documentos de las iniciativas).

import { getSession } from '@/lib/session';
import { deleteDoc, getDoc } from '@/lib/firestore-rest';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.user.role !== 'Admin') {
      return Response.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as {
      userId?: string;
    } | null;
    const userId = body?.userId ?? '';
    if (!/^[\w-]+$/.test(userId)) {
      return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
    }
    if (userId === session.user.id) {
      return Response.json(
        { error: 'No puedes borrar tu propio perfil.' },
        { status: 400 }
      );
    }

    const target = await getDoc<{ name?: string }>(`users/${userId}`, ['name']);
    if (!target) {
      return Response.json(
        { error: 'El usuario ya no existe.' },
        { status: 404 }
      );
    }

    await deleteDoc(`users/${userId}`);
    return Response.json({ ok: true });
  } catch (e: any) {
    console.error('[api/delete-user] error', {
      name: e?.name,
      message: e?.message,
    });
    return Response.json(
      { error: 'No se pudo borrar el usuario.' },
      { status: 500 }
    );
  }
}
