// Flags globales de la app. Se leen en tiempo de build vía variables de entorno
// públicas (NEXT_PUBLIC_*). Cambia el valor en .env o en Cloudflare Pages y
// vuelve a desplegar.

function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const v = String(raw).trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  return fallback;
}

// Podcast de las iniciativas. Se apagó de cara al día del jurado para
// enfocar la lectura en la ficha escrita.
export const PODCASTS_ENABLED = envFlag('NEXT_PUBLIC_PODCASTS_ENABLED', false);
