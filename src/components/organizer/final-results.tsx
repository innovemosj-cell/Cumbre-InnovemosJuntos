'use client';

// Resultados de la EVALUACIÓN FINAL para el organizador: podio de las 3
// mejores iniciativas y tabla completa con promedios por criterio.

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Star, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IdeaWithFinalTotals, User } from '@/lib/types';
import type { FinalCriterion } from '@/lib/final-criteria';

const PODIUM_STYLES = [
  {
    label: '1er lugar',
    card: 'border-amber-300 bg-amber-50',
    trophy: 'text-amber-500',
  },
  {
    label: '2do lugar',
    card: 'border-slate-300 bg-slate-50',
    trophy: 'text-slate-400',
  },
  {
    label: '3er lugar',
    card: 'border-orange-300 bg-orange-50',
    trophy: 'text-orange-600',
  },
];

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export function FinalResults({
  results,
  criteria,
  jurors,
}: {
  results: IdeaWithFinalTotals[];
  criteria: FinalCriterion[];
  jurors: User[];
}) {
  const rated = results.filter((r) => r.finalTotals.ratingCount > 0);
  const podium = rated.slice(0, 3);

  if (rated.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
          <p className="text-lg font-semibold text-muted-foreground">
            Aún no hay calificaciones de la evaluación final
          </p>
          <p className="text-sm text-muted-foreground/80">
            Los resultados aparecerán aquí cuando los jurados empiecen a
            calificar.
          </p>
        </div>
        <JurorProgress results={results} jurors={jurors} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Podio */}
      <div className="grid gap-4 sm:grid-cols-3">
        {podium.map((idea, i) => {
          const style = PODIUM_STYLES[i];
          return (
            <Card
              key={idea.id}
              className={cn('relative overflow-hidden border-2 p-5', style.card)}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="bg-white/70 font-semibold">
                  {style.label}
                </Badge>
                <Trophy className={cn('h-6 w-6', style.trophy)} />
              </div>
              <h3 className="mt-3 font-headline text-lg font-semibold leading-snug">
                {idea.nombreSolucion || idea.name}
              </h3>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Promedio ponderado
                  </p>
                  <p className="flex items-center gap-1 font-headline text-2xl font-bold">
                    {fmt(idea.finalTotals.weightedAvg)}
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-normal text-muted-foreground">
                      /5
                    </span>
                  </p>
                </div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {idea.finalTotals.ratingCount}{' '}
                  {idea.finalTotals.ratingCount === 1 ? 'jurado' : 'jurados'}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tabla completa */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead className="min-w-[220px]">Iniciativa</TableHead>
              {criteria.map((c) => (
                <TableHead key={c.key} className="text-center text-xs">
                  {c.label}
                  <span className="block font-normal text-muted-foreground">
                    ({c.weight}%)
                  </span>
                </TableHead>
              ))}
              <TableHead className="text-center text-xs">Jurados</TableHead>
              <TableHead className="text-right text-xs">Total bruto</TableHead>
              <TableHead className="text-right">Ponderado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rated.map((idea, i) => (
              <TableRow key={idea.id} className={cn(i < 3 && 'bg-amber-50/50')}>
                <TableCell className="text-center font-bold">{i + 1}</TableCell>
                <TableCell>
                  <div className="font-medium">
                    {idea.nombreSolucion || idea.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {idea.group}
                  </div>
                </TableCell>
                {criteria.map((c) => (
                  <TableCell key={c.key} className="text-center">
                    {idea.finalTotals.avgByCriterion[c.key] > 0
                      ? fmt(idea.finalTotals.avgByCriterion[c.key])
                      : '—'}
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  <span className="font-medium">
                    {idea.finalTotals.ratingCount}
                  </span>
                  {idea.finalVoters.length > 0 && (
                    <span className="mt-0.5 block max-w-[140px] text-[10px] leading-tight text-muted-foreground">
                      {idea.finalVoters.map((v) => v.name).join(', ')}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {idea.finalTotals.rawTotal}
                </TableCell>
                <TableCell className="text-right text-lg font-bold text-primary">
                  {fmt(idea.finalTotals.weightedAvg)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Avance de los jurados */}
      <JurorProgress results={results} jurors={jurors} />

      {/* Observaciones de los jurados */}
      <FinalObservations results={rated} />
    </div>
  );
}

// Muestra qué jurados han contestado la evaluación final y qué les falta.
function JurorProgress({
  results,
  jurors,
}: {
  results: IdeaWithFinalTotals[];
  jurors: User[];
}) {
  if (jurors.length === 0) return null;

  const activeIdeas = results.filter((r) => r.active !== false);
  const total = activeIdeas.length;

  const progress = jurors
    .map((juror) => {
      const pending = activeIdeas.filter(
        (idea) => !(idea.finalRatings ?? {})[juror.id]
      );
      return { juror, answered: total - pending.length, pending };
    })
    .sort((a, b) => b.answered - a.answered);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-headline text-xl font-semibold">
          ¿Qué jurados han contestado?
        </h2>
        <p className="text-sm text-muted-foreground">
          Avance de cada jurado sobre las {total} iniciativas activas.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {progress.map(({ juror, answered, pending }) => {
          const done = answered === total && total > 0;
          return (
            <Card key={juror.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium leading-tight">{juror.name}</p>
                {done ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Completo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    <Circle className="h-3 w-3" /> {answered}/{total}
                  </span>
                )}
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full transition-all',
                    done ? 'bg-emerald-500' : 'bg-amber-500'
                  )}
                  style={{
                    width: `${total > 0 ? (answered / total) * 100 : 0}%`,
                  }}
                />
              </div>
              {!done && pending.length > 0 && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  Pendiente:{' '}
                  {pending.map((p) => p.nombreSolucion || p.name).join(', ')}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FinalObservations({ results }: { results: IdeaWithFinalTotals[] }) {
  const withObs = results
    .map((idea) => ({
      idea,
      obs: Object.entries(idea.finalRatings ?? {})
        .filter(([, r]) => (r.observations ?? '').trim() !== '')
        .map(([jurorId, r]) => ({
          jurorName:
            idea.finalVoters.find((v) => v.id === jurorId)?.name ?? 'Jurado',
          text: r.observations!,
        })),
    }))
    .filter((e) => e.obs.length > 0);

  if (withObs.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="font-headline text-xl font-semibold">
        Observaciones de los jurados
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {withObs.map(({ idea, obs }) => (
          <Card key={idea.id} className="p-4">
            <h3 className="font-medium leading-snug">
              {idea.nombreSolucion || idea.name}
            </h3>
            <ul className="mt-2 space-y-2">
              {obs.map((o, i) => (
                <li key={i} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {o.jurorName}
                  </p>
                  <p className="mt-0.5 italic leading-snug">{o.text}</p>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
