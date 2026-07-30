'use client';

// Envoltorio con estado del panel de resultados finales. El botón
// "Actualizar" trae SOLO los votos (finalRatings) de las iniciativas vía
// /api/final-results y recalcula el ranking en el navegador: no vuelve a
// leer usuarios ni criterios de Firestore.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';
import { FinalResults } from './final-results';
import {
  compareFinalTotals,
  computeFinalTotals,
  type FinalCriterion,
} from '@/lib/final-criteria';
import type { FinalRating, IdeaWithFinalTotals, User } from '@/lib/types';

type FreshIdea = { id: string; finalRatings: Record<string, FinalRating> };

export function FinalResultsLive({
  initialResults,
  criteria,
  jurors,
}: {
  initialResults: IdeaWithFinalTotals[];
  criteria: FinalCriterion[];
  jurors: User[];
}) {
  const [results, setResults] = useState(initialResults);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleRefresh() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/final-results');
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = (await res.json()) as { ideas: FreshIdea[] };
      const freshById = new Map(json.ideas.map((i) => [i.id, i.finalRatings]));
      setResults((prev) =>
        prev
          .map((idea) => {
            const finalRatings =
              freshById.get(idea.id) ?? idea.finalRatings ?? {};
            return {
              ...idea,
              finalRatings,
              finalTotals: computeFinalTotals(finalRatings, criteria),
              finalVoters: jurors.filter((j) => !!finalRatings[j.id]),
            };
          })
          .sort((a, b) => compareFinalTotals(a.finalTotals, b.finalTotals))
      );
      setUpdatedAt(new Date());
    } catch (e: any) {
      console.error('[final-results-live] error', { message: e?.message });
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          {isLoading ? 'Actualizando…' : 'Actualizar'}
        </Button>
        <p className="text-xs text-muted-foreground">
          {updatedAt
            ? `Actualizado a las ${updatedAt.toLocaleTimeString('es-CO')}`
            : 'Trae solo los votos nuevos de los jurados (lectura mínima).'}
        </p>
      </div>
      <FinalResults results={results} criteria={criteria} jurors={jurors} />
    </div>
  );
}
