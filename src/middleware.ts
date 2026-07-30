import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Rutas que un usuario tipo Equipo NO puede visitar. Si accede a una de estas
// lo devolvemos a /mi-iniciativa.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard',
    '/admin/:path*',
    '/organizer/:path*',
    '/organizer',
    '/my-results/:path*',
    '/my-results',
    '/ideas/:path*',
  ],
};

export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get('session')?.value;
  if (!cookie) return NextResponse.next();

  const secret = process.env.SESSION_SECRET;
  if (!secret) return NextResponse.next();

  try {
    const { payload } = await jwtVerify(
      cookie,
      new TextEncoder().encode(secret),
      { algorithms: ['HS256'] }
    );
    const role = (payload as any)?.user?.role;
    if (role === 'Equipo') {
      const url = req.nextUrl.clone();
      url.pathname = '/mi-iniciativa';
      url.search = '';
      return NextResponse.redirect(url);
    }
  } catch {
    // Cookie inválida: dejamos pasar; el layout redirigirá a login.
  }

  return NextResponse.next();
}
