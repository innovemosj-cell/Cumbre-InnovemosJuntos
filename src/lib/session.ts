'use server';

import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import type { User } from './types';
import { cookies } from 'next/headers';

const secretKey = process.env.SESSION_SECRET;
if (!secretKey || secretKey.length < 32) {
  throw new Error(
    'SESSION_SECRET es obligatorio y debe tener al menos 32 caracteres. ' +
      'Configúralo en .env (local) y en Cloudflare Pages > Settings > Environment variables (producción).'
  );
}
const key = new TextEncoder().encode(secretKey);

export async function createSession(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // 1 day
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', { message: (error as any)?.message });
    return null;
  }
}

type Session =
  | { isLoggedIn: true; user: User }
  | { isLoggedIn: false; user: null };

export async function getSession(): Promise<Session> {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) {
    return { isLoggedIn: false, user: null };
  }

  const payload = await decrypt(sessionCookie);
  if (!payload || !payload.user) {
    return { isLoggedIn: false, user: null };
  }

  return { isLoggedIn: true, user: payload.user as User };
}
