'use client';

// Lista pública de iniciativas para la votación del público, con
// confirmación antes de enviar el voto (solo se puede votar una vez).

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import type { PublicVotingIdea } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2,
  Heart,
  Loader2,
  Lock,
  PartyPopper,
  User as UserIcon,
  Users,
} from 'lucide-react';

function hasRealTeamPhoto(url: string | undefined): boolean {
  if (!url) return false;
  if (/picsum\.photos/i.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

export function PublicVoteList({
  ideas,
  open,
  votedIdeaId,
}: {
  ideas: PublicVotingIdea[];
  open: boolean;
  votedIdeaId: string | null;
}) {
  const [voted, setVoted] = useState<string | null>(votedIdeaId);
  const [pendingIdea, setPendingIdea] = useState<PublicVotingIdea | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasVoted = voted !== null;

  function confirmVote() {
    if (!pendingIdea) return;
    const idea = pendingIdea;
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/public-votes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ideaId: idea.id }),
        });
        let body: any = null;
        try {
          body = await res.json();
        } catch {
          // respuesta no JSON
        }
        if (res.status === 409) {
          // Ya había votado (otra pestaña, doble clic): reflejamos el estado.
          setVoted((v) => v ?? idea.id);
          setPendingIdea(null);
          setErrorMsg(body?.error ?? 'Ya registraste tu voto.');
          return;
        }
        if (!res.ok || body?.error) {
          setErrorMsg(body?.error ?? 'No se pudo registrar tu voto. Intenta de nuevo.');
          setPendingIdea(null);
          return;
        }
        setVoted(idea.id);
        setPendingIdea(null);
      } catch (e: any) {
        console.error('public vote error:', { message: e?.message });
        setErrorMsg('No se pudo registrar tu voto. Revisa tu conexión e intenta de nuevo.');
        setPendingIdea(null);
      }
    });
  }

  if (ideas.length === 0) {
    return (
      <p className="rounded-lg border-2 border-dashed border-muted-foreground/30 py-16 text-center text-muted-foreground">
        Aún no hay iniciativas disponibles.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {!open && !hasVoted && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          <Lock className="h-4 w-4 shrink-0" />
          La votación no está abierta en este momento. Vuelve cuando el
          presentador lo indique.
        </div>
      )}

      {hasVoted && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          <PartyPopper className="h-4 w-4 shrink-0" />
          ¡Gracias! Tu voto quedó registrado.
        </div>
      )}

      {errorMsg && !hasVoted && (
        <p className="text-center text-sm font-medium text-destructive">
          {errorMsg}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ideas.map((idea) => {
          const isMyVote = voted === idea.id;
          const photo = hasRealTeamPhoto(idea.imageUrl) ? idea.imageUrl : null;
          return (
            <Card
              key={idea.id}
              className={cn(
                'flex flex-col overflow-hidden transition-all',
                isMyVote && 'ring-2 ring-emerald-500',
                hasVoted && !isMyVote && 'opacity-60'
              )}
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-sky-100 via-violet-50 to-rose-50">
                {photo ? (
                  <img
                    src={photo}
                    alt={`Equipo de ${idea.name}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-foreground/40">
                    <Users className="h-10 w-10" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                      Foto del equipo
                    </p>
                  </div>
                )}
                {idea.codigo && (
                  <Badge
                    variant="outline"
                    className="absolute left-3 top-3 border-transparent bg-background/90 font-mono text-xs shadow-sm"
                  >
                    #{idea.codigo}
                  </Badge>
                )}
                {isMyVote && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
                    <CheckCircle2 className="h-3 w-3" /> Tu voto
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-headline text-base font-semibold leading-snug line-clamp-2">
                  {idea.name}
                </h3>
                {idea.postulante && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-1">{idea.postulante}</span>
                  </p>
                )}
                <div className="mt-4 flex-1" />
                <Button
                  type="button"
                  className="w-full gap-2"
                  variant={isMyVote ? 'secondary' : 'default'}
                  disabled={!open || hasVoted || isPending}
                  onClick={() => setPendingIdea(idea)}
                >
                  {isMyVote ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Votaste por esta idea
                    </>
                  ) : (
                    <>
                      <Heart className="h-4 w-4" /> Votar por esta idea
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <AlertDialog
        open={pendingIdea !== null}
        onOpenChange={(o) => {
          if (!o && !isPending) setPendingIdea(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmas tu voto?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a votar por{' '}
              <span className="font-semibold text-foreground">
                {pendingIdea?.name}
              </span>
              . Solo puedes votar una vez y no podrás cambiar tu voto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <Button type="button" onClick={confirmVote} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                'Sí, votar'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
