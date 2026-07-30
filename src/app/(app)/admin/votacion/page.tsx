// Panel de admin de la votación del público: controles (abrir/cerrar,
// enlace, borrar votos) y resultados en vivo por iniciativa.

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PublicVotingControls } from '@/components/admin/public-voting-controls';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getActiveIdeas, getPublicVotes, getPublicVotingOpen } from '@/lib/data';
import { getSession } from '@/lib/session';
import { Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export const runtime = 'edge';

export default async function AdminVotacionPage() {
  const { user } = await getSession();
  if (!user || user.role !== 'Admin') {
    redirect('/dashboard');
  }

  const [votes, ideas, open, headerList] = await Promise.all([
    getPublicVotes(),
    getActiveIdeas(),
    getPublicVotingOpen(),
    headers(),
  ]);

  const host = headerList.get('host') ?? 'localhost:9002';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const publicUrl = `${protocol}://${host}/votacion`;
  const resultsUrl = `${protocol}://${host}/votacion/resultados`;

  const countByIdea = new Map<string, number>();
  for (const vote of votes) {
    countByIdea.set(vote.ideaId, (countByIdea.get(vote.ideaId) ?? 0) + 1);
  }

  const results = ideas
    .map((idea) => ({
      id: idea.id,
      name: idea.nombreSolucion || idea.name,
      codigo: idea.codigo,
      votes: countByIdea.get(idea.id) ?? 0,
    }))
    .sort((a, b) => b.votes - a.votes);

  const totalVotes = votes.length;
  const maxVotes = results[0]?.votes ?? 0;

  return (
    <div className="container mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Votación del público
          </h1>
          <p className="text-muted-foreground">
            Resultados en vivo del voto del público por su idea favorita.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-headline text-2xl font-bold">{totalVotes}</span>
          <span className="text-sm text-muted-foreground">
            {totalVotes === 1 ? 'voto' : 'votos'}
          </span>
        </div>
      </div>

      <PublicVotingControls
        open={open}
        publicUrl={publicUrl}
        resultsUrl={resultsUrl}
      />

      <Card className="p-5">
        <h2 className="mb-4 font-headline text-lg font-semibold">
          Resultados por iniciativa
        </h2>
        {results.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed border-muted-foreground/30 py-10 text-center text-sm text-muted-foreground">
            No hay iniciativas activas.
          </p>
        ) : (
          <div className="space-y-3">
            {results.map((r, i) => {
              const pct = totalVotes > 0 ? (r.votes / totalVotes) * 100 : 0;
              const barPct = maxVotes > 0 ? (r.votes / maxVotes) * 100 : 0;
              const isLeader = i === 0 && r.votes > 0;
              return (
                <div key={r.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-6 shrink-0 text-center font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      {r.codigo && (
                        <Badge variant="outline" className="shrink-0 font-mono text-xs">
                          #{r.codigo}
                        </Badge>
                      )}
                      <span className="truncate font-medium">{r.name}</span>
                      {isLeader && (
                        <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
                      )}
                    </div>
                    <span className="shrink-0 font-semibold">
                      {r.votes}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({pct.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="ml-8 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        isLeader ? 'bg-amber-500' : 'bg-primary/60'
                      )}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Recarga la página para actualizar el conteo.
        </p>
      </Card>
    </div>
  );
}
