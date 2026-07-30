'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ChevronDown, Trophy, MessageSquare } from 'lucide-react';
import type { FrenteKey, IdeaWithTotals } from '@/lib/types';

type ResultsDashboardProps = {
  results: IdeaWithTotals[];
};

const FRENTE_META: Record<
  FrenteKey,
  { label: string; bar: string; chip: string }
> = {
  estrategia: {
    label: 'Estrategia',
    bar: 'bg-sky-500',
    chip: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  impacto: {
    label: 'Impacto',
    bar: 'bg-rose-500',
    chip: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  innovacion: {
    label: 'Innovación',
    bar: 'bg-violet-500',
    chip: 'bg-violet-100 text-violet-800 border-violet-200',
  },
  tecnico: {
    label: 'Técnico',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
};

function rankBadge(rank: number) {
  if (rank === 1)
    return (
      <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400/80">
        <Trophy className="mr-1 h-3 w-3" /> 1°
      </Badge>
    );
  if (rank === 2)
    return (
      <Badge className="bg-slate-300 text-slate-900 hover:bg-slate-300/80">
        <Trophy className="mr-1 h-3 w-3" /> 2°
      </Badge>
    );
  if (rank === 3)
    return (
      <Badge className="bg-orange-400 text-orange-900 hover:bg-orange-400/80">
        <Trophy className="mr-1 h-3 w-3" /> 3°
      </Badge>
    );
  return (
    <Badge variant="outline" className="font-mono">
      #{rank}
    </Badge>
  );
}

function ResultRow({
  idea,
  rank,
}: {
  idea: IdeaWithTotals;
  rank: number;
}) {
  const [open, setOpen] = useState(false);
  const frentes: FrenteKey[] = ['estrategia', 'impacto', 'innovacion', 'tecnico'];

  const jurorComments = Object.entries(idea.ratings ?? {})
    .map(([jurorId, rating]) => {
      const voter = idea.voters.find((v) => v.id === jurorId);
      return {
        jurorId,
        name: voter?.name ?? 'Jurado',
        avatarUrl: voter?.avatarUrl,
        observations: rating.observations?.trim() ?? '',
      };
    })
    .filter((x) => x.observations.length > 0);

  const title = idea.nombreSolucion || idea.name;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-card transition-shadow',
          open && 'shadow-sm'
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="shrink-0">{rankBadge(rank)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-headline text-base font-semibold leading-tight sm:text-lg">
                {title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {idea.codigo && (
                  <span className="font-mono">#{idea.codigo}</span>
                )}
                {idea.postulante && <span>{idea.postulante}</span>}
                {idea.area && <span>{idea.area}</span>}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <span>{idea.ratingCount}</span>
              <span>votos</span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Puntaje
              </p>
              <p className="font-headline text-2xl font-bold text-primary leading-none">
                {idea.totalScores.weightedTotal.toFixed(1)}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
                open && 'rotate-180'
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t bg-muted/20 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {frentes.map((f) => {
                const score = idea.totalScores.porFrente[f];
                const meta = FRENTE_META[f];
                return (
                  <div key={f} className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={cn('text-xs', meta.chip)}>
                        {meta.label}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        ({score.ratedCount})
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold tabular-nums">
                      {score.raw.toFixed(1)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        / 100
                      </span>
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full transition-all', meta.bar)}
                        style={{ width: `${Math.min(100, score.raw)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                Comentarios de jurados ({jurorComments.length})
              </div>
              {jurorComments.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">
                  Los jurados no dejaron observaciones para esta iniciativa.
                </p>
              ) : (
                <ul className="space-y-2">
                  {jurorComments.map((c) => (
                    <li
                      key={c.jurorId}
                      className="flex items-start gap-3 rounded-md border bg-card p-3"
                    >
                      <Avatar className="h-7 w-7">
                        {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.name} />}
                        <AvatarFallback>{c.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{c.name}</p>
                        <p className="mt-0.5 whitespace-pre-line text-sm italic text-foreground/80">
                          {c.observations}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
              <span>Votaron:</span>
              <div className="flex flex-wrap gap-2">
                {idea.voters.length === 0 ? (
                  <span className="italic">Aún no hay votos.</span>
                ) : (
                  idea.voters.map((v) => (
                    <span key={v.id} className="inline-flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        {v.avatarUrl && <AvatarImage src={v.avatarUrl} alt={v.name} />}
                        <AvatarFallback className="text-[9px]">
                          {v.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>{v.name}</span>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function ResultsDashboard({ results }: ResultsDashboardProps) {
  const ranked = useMemo(() => {
    return [...results].sort(
      (a, b) => b.totalScores.weightedTotal - a.totalScores.weightedTotal
    );
  }, [results]);

  const top10 = ranked.slice(0, 10);
  const rest = ranked.slice(10);

  if (ranked.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
        <p className="text-lg font-semibold text-muted-foreground">
          Aún no hay resultados
        </p>
        <p className="text-sm text-muted-foreground/80">
          Los resultados aparecerán aquí una vez que los jueces hayan calificado
          las iniciativas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <p className="font-headline text-lg font-semibold">
            Top 10 iniciativas
          </p>
          <p className="text-sm text-muted-foreground">
            Haz clic en cada iniciativa para ver el desglose por frente y los
            comentarios de los jurados.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {top10.map((idea, i) => (
          <ResultRow key={idea.id} idea={idea} rank={i + 1} />
        ))}
      </div>

      {rest.length > 0 && (
        <details className="rounded-xl border bg-muted/20 p-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            Ver {rest.length} iniciativa{rest.length === 1 ? '' : 's'} restante
            {rest.length === 1 ? '' : 's'}
          </summary>
          <div className="mt-3 space-y-2">
            {rest.map((idea, i) => (
              <div
                key={idea.id}
                className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm"
              >
                <Badge variant="outline" className="font-mono">
                  #{i + 11}
                </Badge>
                <span className="flex-1 min-w-0 truncate font-medium">
                  {idea.nombreSolucion || idea.name}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {idea.totalScores.weightedTotal.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
