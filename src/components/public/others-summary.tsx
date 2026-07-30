'use client';

// Resumen TOTALIZADO de las iniciativas fuera del podio. Por defecto solo
// muestra el agregado (votos y % del grupo) para no exponer públicamente a
// los equipos que quedaron de últimos; el detalle se despliega con un clic
// a criterio de quien controla la pantalla.

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { PublicTopIdea } from '@/lib/data';
import { ChevronDown, Layers } from 'lucide-react';

export function OthersSummary({
  others,
  startRank,
}: {
  others: PublicTopIdea[];
  startRank: number;
}) {
  const [open, setOpen] = useState(false);

  if (others.length === 0) return null;

  const groupVotes = others.reduce((sum, o) => sum + o.votes, 0);
  const groupPct = others.reduce((sum, o) => sum + o.pct, 0);
  const maxOtherVotes = Math.max(...others.map((o) => o.votes), 1);

  return (
    <div className="mx-auto mt-14 max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 sm:px-5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/10">
            <Layers className="h-5 w-5 text-sky-400" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white/85">
              Las demás iniciativas ({others.length})
            </span>
            <span className="block text-xs text-white/45">
              {open ? 'Ocultar detalle' : 'Toca para ver el detalle'}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block font-headline text-2xl font-bold tabular-nums leading-none">
              {groupVotes.toLocaleString('es-CO')}
            </span>
            <span className="block text-[11px] text-white/45">
              {groupVotes === 1 ? 'voto' : 'votos'} · {groupPct.toFixed(1)}%
            </span>
          </span>
          <ChevronDown
            className={cn(
              'ml-1 h-5 w-5 shrink-0 text-white/40 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </button>

        {open && (
          <div className="divide-y divide-white/[0.06] border-t border-white/10">
            {others.map((idea, i) => (
              <div key={idea.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="w-7 shrink-0 text-center font-headline text-sm font-bold text-white/40">
                  {startRank + i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    {idea.codigo && (
                      <span className="shrink-0 font-mono text-[10px] text-white/40">
                        #{idea.codigo}
                      </span>
                    )}
                    <p className="truncate text-sm font-medium text-white/85">
                      {idea.name}
                    </p>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-sky-400/70"
                      style={{ width: `${(idea.votes / maxOtherVotes) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-headline text-lg font-bold tabular-nums leading-none">
                    {idea.votes.toLocaleString('es-CO')}
                  </p>
                  <p className="text-[11px] text-white/45">
                    {idea.pct.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
