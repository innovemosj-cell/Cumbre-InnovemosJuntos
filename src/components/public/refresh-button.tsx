'use client';

// Botón de actualización MANUAL del panel público de resultados.
// Reemplaza el refresco automático para no consumir lecturas de Firestore
// mientras nadie necesita ver datos nuevos.

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

export function RefreshButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:opacity-60"
    >
      <RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} />
      {isPending ? 'Actualizando…' : 'Actualizar'}
    </button>
  );
}
