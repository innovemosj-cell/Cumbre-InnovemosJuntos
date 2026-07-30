// API Route para cerrar sesión. Reemplaza al server action handleLogout:
// las server actions hacen POST a la URL de la página actual y en CF Pages +
// next-on-pages ese POST devuelve 404 en rutas dinámicas ([id]), dejando la
// cookie de sesión viva aunque el usuario "cierre sesión".

import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function POST() {
  (await cookies()).set('session', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
