// Panel PÚBLICO de resultados de la votación del público, pensado para
// proyectar en pantalla: total de votos y podio con los 3 primeros.
// La actualización es MANUAL (botón "Actualizar") para no consumir lecturas
// de Firestore; el servidor además responde desde un cache en memoria de
// 15 s como protección si muchos espectadores actualizan a la vez.

import { RefreshButton } from '@/components/public/refresh-button';
import { OthersSummary } from '@/components/public/others-summary';
import { Logo } from '@/components/icons/logo';
import { getPublicResultsSnapshot } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Trophy, Users } from 'lucide-react';

export const runtime = 'edge';

export const metadata = {
  title: 'Resultados — Votación del público',
};

function hasRealTeamPhoto(url: string | undefined): boolean {
  if (!url) return false;
  if (/picsum\.photos/i.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

// Podio estilo premiación: las tarjetas no se escalan (evita traslapes);
// la jerarquía la dan los PEDESTALES de distinta altura bajo cada tarjeta
// (1º el más alto, 2º medio, 3º bajo) más una tipografía levemente mayor
// para el ganador.
const PODIUM = [
  {
    place: '1er lugar',
    medal: 'text-amber-400',
    ring: 'ring-amber-400/80',
    glow: 'shadow-[0_0_60px_-10px_rgba(251,191,36,0.45)]',
    bar: 'from-amber-400 to-yellow-500',
    order: 'sm:order-2',
    pad: 'p-6',
    medalIcon: 'h-6 w-6',
    title: 'text-xl sm:text-2xl',
    votes: 'text-5xl sm:text-6xl',
    pedestal: 'sm:h-36',
    pedestalNum: '1',
    pedestalStyle: 'border-amber-400/50 bg-gradient-to-b from-amber-400/25 to-amber-400/5',
    pedestalText: 'text-amber-400/70',
  },
  {
    place: '2do lugar',
    medal: 'text-slate-300',
    ring: 'ring-slate-400/70',
    glow: 'shadow-[0_0_40px_-12px_rgba(148,163,184,0.4)]',
    bar: 'from-slate-300 to-slate-400',
    order: 'sm:order-1',
    pad: 'p-5',
    medalIcon: 'h-5 w-5',
    title: 'text-lg sm:text-xl',
    votes: 'text-4xl sm:text-5xl',
    pedestal: 'sm:h-24',
    pedestalNum: '2',
    pedestalStyle: 'border-slate-400/50 bg-gradient-to-b from-slate-400/25 to-slate-400/5',
    pedestalText: 'text-slate-300/70',
  },
  {
    place: '3er lugar',
    medal: 'text-orange-400',
    ring: 'ring-orange-400/70',
    glow: 'shadow-[0_0_40px_-12px_rgba(251,146,60,0.4)]',
    bar: 'from-orange-400 to-orange-500',
    order: 'sm:order-3',
    pad: 'p-5',
    medalIcon: 'h-5 w-5',
    title: 'text-lg sm:text-xl',
    votes: 'text-4xl sm:text-5xl',
    pedestal: 'sm:h-14',
    pedestalNum: '3',
    pedestalStyle: 'border-orange-400/50 bg-gradient-to-b from-orange-400/25 to-orange-400/5',
    pedestalText: 'text-orange-400/70',
  },
];

export default async function ResultadosVotacionPage() {
  const { total, top, others } = await getPublicResultsSnapshot();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Resplandor de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.25),rgba(56,189,248,0.08)_50%,transparent_75%)]"
      />

      <header className="relative border-b border-white/10">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6 text-sky-400" />
            <span className="font-bold">CalificApp</span>
            <span className="text-sm text-white/50">· Votación del público</span>
          </div>
          <RefreshButton />
        </div>
      </header>

      <main className="container relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-5xl">
            Las favoritas del público
          </h1>
          <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 backdrop-blur">
            <Users className="h-6 w-6 text-sky-400" />
            <span className="font-headline text-4xl font-bold tabular-nums sm:text-5xl">
              {total.toLocaleString('es-CO')}
            </span>
            <span className="text-sm text-white/60">
              {total === 1 ? 'voto recibido' : 'votos recibidos'}
            </span>
          </div>
        </div>

        {top.length === 0 ? (
          <div className="mt-16 text-center">
            <Trophy className="mx-auto h-14 w-14 text-white/20" />
            <p className="mt-4 text-lg font-medium text-white/70">
              Aún no hay votos registrados
            </p>
            <p className="text-sm text-white/40">
              El podio aparecerá aquí en cuanto el público empiece a votar.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 items-end gap-6 sm:grid-cols-3 sm:gap-4">
            {top.map((idea, i) => {
              const style = PODIUM[i];
              const photo = hasRealTeamPhoto(idea.imageUrl) ? idea.imageUrl : null;
              return (
                <div key={idea.id} className={cn('flex flex-col', style.order)}>
                  {/* Tarjeta */}
                  <div
                    className={cn(
                      'overflow-hidden rounded-2xl bg-white/[0.06] ring-2 backdrop-blur',
                      style.ring,
                      style.glow
                    )}
                  >
                    {photo && (
                      <div className="relative aspect-[16/8] w-full overflow-hidden">
                        <img
                          src={photo}
                          alt={`Equipo de ${idea.name}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                      </div>
                    )}
                    <div className={cn('text-center', style.pad)}>
                      <div className="flex items-center justify-center gap-2">
                        <Trophy className={cn(style.medalIcon, style.medal)} />
                        <span className={cn('text-xs font-bold uppercase tracking-widest', style.medal)}>
                          {style.place}
                        </span>
                      </div>
                      <h2 className={cn('mt-2 font-headline font-semibold leading-snug', style.title)}>
                        {idea.name}
                      </h2>
                      {idea.postulante && (
                        <p className="mt-1 truncate text-xs text-white/50">
                          {idea.postulante}
                        </p>
                      )}
                      <p className={cn('mt-4 font-headline font-bold tabular-nums', style.votes)}>
                        {idea.votes.toLocaleString('es-CO')}
                      </p>
                      <p className="text-xs text-white/50">
                        {idea.votes === 1 ? 'voto' : 'votos'} ·{' '}
                        {idea.pct.toFixed(1)}%
                      </p>
                      <div className="mx-auto mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={cn('h-full rounded-full bg-gradient-to-r', style.bar)}
                          style={{ width: `${Math.max(idea.pct, 4)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pedestal del podio (solo en pantallas anchas) */}
                  <div
                    className={cn(
                      'mt-3 hidden items-center justify-center rounded-t-xl border border-b-0 sm:flex',
                      style.pedestal,
                      style.pedestalStyle
                    )}
                  >
                    <span
                      className={cn(
                        'font-headline text-5xl font-black tabular-nums',
                        style.pedestalText
                      )}
                    >
                      {style.pedestalNum}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Resto de iniciativas: totalizado por defecto, detalle con un clic */}
        {top.length > 0 && (
          <OthersSummary others={others} startRank={top.length} />
        )}

        <p className="mt-12 text-center text-xs text-white/30">
          Usa el botón &laquo;Actualizar&raquo; para ver los resultados más recientes
        </p>
      </main>
    </div>
  );
}
