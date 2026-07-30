'use server';

import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import type { User } from './types';
import { cookies } from 'next/headers';

// La validación es diferida (primer uso, no carga del módulo): durante el
// build de Cloudflare Pages los secretos no existen y evaluar esto al
// importar rompía "Collecting page data".
let cachedKey: Uint8Array | null = null;

function getKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const secretKey = process.env.SESSION_SECRET;
  if (!secretKey || secretKey.length < 32) {
    throw new Error(
      'SESSION_SECRET es obligatorio y debe tener al menos 32 caracteres. ' +
        'Configúralo en .env (local) y en Cloudflare Pages > Settings > Environment variables (producción).'
    );
  }
  cachedKey = new TextEncoder().encode(secretKey);
  return cachedKey;
}

export async function createSession(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // 1 day
    .sign(getKey());
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, getKey(), {
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
