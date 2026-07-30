'use client';

import { useState } from 'react';
import { User } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, RefreshCw } from 'lucide-react';

type Voter = Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;

type VoterListProps = {
  voters: Voter[];
  // Si se pasa (perfil organizador), muestra el botón "Actualizar" que trae
  // solo los jurados nuevos de esta iniciativa vía /api/idea-voters:
  // 1 lectura del doc de la idea + 1 por jurado nuevo.
  refresh?: { ideaId: string; mode: 'final' | 'preselection' };
};

export function VoterList({ voters: initialVoters, refresh }: VoterListProps) {
  const [voters, setVoters] = useState(initialVoters);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleRefresh() {
    if (!refresh) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        ideaId: refresh.ideaId,
        mode: refresh.mode,
        known: voters.map((v) => v.id).join(','),
      });
      const res = await fetch(`/api/idea-voters?${params.toString()}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = (await res.json()) as {
        voterIds: string[];
        newVoters: Voter[];
      };
      // Orden estable: conserva el orden ya mostrado y agrega los jurados
      // nuevos al final (el orden de las claves del mapa en Firestore no
      // está garantizado y hacía que la lista se reorganizara en cada clic).
      setVoters((prev) => {
        const validIds = new Set(json.voterIds);
        const kept = prev.filter((v) => validIds.has(v.id));
        const keptIds = new Set(kept.map((v) => v.id));
        const newById = new Map(json.newVoters.map((v) => [v.id, v]));
        const added = json.voterIds
          .filter((id) => !keptIds.has(id))
          .map((id) => newById.get(id))
          .filter((v): v is Voter => !!v);
        return [...kept, ...added];
      });
      setUpdatedAt(new Date());
    } catch (e: any) {
      console.error('[voter-list] error', { message: e?.message });
      toast({
        variant: 'destructive',
        title: 'No se pudo actualizar',
        description: 'Intenta de nuevo en unos segundos.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="font-headline text-xl">
              Jurados que han Votado
            </CardTitle>
            <CardDescription>
              {voters.length > 0
                ? 'La siguiente lista muestra los jurados que ya han emitido su calificación para esta idea.'
                : 'Aún ningún jurado ha calificado esta idea.'}
            </CardDescription>
          </div>
          {refresh && (
            <div className="flex flex-col items-end gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw
                  className={isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                />
                {isLoading ? 'Actualizando…' : 'Actualizar'}
              </Button>
              {updatedAt && (
                <p className="text-xs text-muted-foreground">
                  Actualizado a las {updatedAt.toLocaleTimeString('es-CO')}
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {voters.length > 0 ? (
          <ul className="space-y-4">
            {voters.map((voter) => (
              <li key={voter.id} className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={voter.avatarUrl} alt={voter.name} />
                  <AvatarFallback>{voter.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <p className="font-medium">{voter.name}</p>
                  <p className="text-sm text-muted-foreground">{voter.email}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-10 text-center">
            <p className="text-lg font-semibold text-muted-foreground">
              Sin Votos Aún
            </p>
            <p className="text-sm text-muted-foreground/80">
              Los jurados aparecerán aquí cuando califiquen.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
