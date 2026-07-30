'use client';

// Editor de los criterios de la EVALUACIÓN FINAL: el admin puede cambiar el
// título, la pregunta, el peso y la aclaración de cada estrella. Los 4
// criterios se guardan juntos para validar que los pesos sumen 100.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { FinalCriterion } from '@/lib/final-criteria';
import { updateFinalCriteriaAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2, Save, Star } from 'lucide-react';

export function FinalCriteriaEditor({ initial }: { initial: FinalCriterion[] }) {
  const [criteria, setCriteria] = useState<FinalCriterion[]>(initial);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const totalWeight = useMemo(
    () =>
      Math.round(criteria.reduce((sum, c) => sum + (c.weight || 0), 0) * 100) /
      100,
    [criteria]
  );
  const weightsValid = Math.abs(totalWeight - 100) < 0.0001;
  const isDirty = JSON.stringify(criteria) !== JSON.stringify(initial);

  function patchCriterion(key: string, patch: Partial<FinalCriterion>) {
    setCriteria((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...patch } : c))
    );
  }

  function patchStarMeaning(
    key: string,
    stars: number,
    patch: { label?: string; description?: string }
  ) {
    setCriteria((prev) =>
      prev.map((c) =>
        c.key === key
          ? {
              ...c,
              starMeanings: c.starMeanings.map((m) =>
                m.stars === stars ? { ...m, ...patch } : m
              ),
            }
          : c
      )
    );
  }

  const handleSave = () => {
    if (!weightsValid) return;
    startTransition(async () => {
      const result = await updateFinalCriteriaAction(criteria);
      if (result.success) {
        toast({ title: 'Criterios guardados', description: result.message });
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <Star className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h2 className="font-headline text-lg font-semibold">
              Criterios de la Evaluación Final
            </h2>
            <p className="text-sm text-muted-foreground">
              Edita el título, la pregunta, el peso y lo que significa cada
              estrella. Los cinco pesos deben sumar 100.
            </p>
          </div>
        </div>
        <div
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            weightsValid
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-800'
          )}
        >
          Total: {totalWeight}%
        </div>
      </div>

      <div className="space-y-3">
        {criteria.map((criterion, index) => {
          const open = openKey === criterion.key;
          return (
            <Collapsible
              key={criterion.key}
              open={open}
              onOpenChange={(o) => setOpenKey(o ? criterion.key : null)}
            >
              <div className="rounded-lg border">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold leading-tight">
                          {criterion.label}
                        </p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {criterion.question}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                        {criterion.weight}%
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-muted-foreground transition-transform duration-200',
                          open && 'rotate-180'
                        )}
                      />
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-4 border-t bg-muted/20 p-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                      <div className="space-y-1.5">
                        <Label htmlFor={`fc-label-${criterion.key}`}>
                          Título del criterio
                        </Label>
                        <Input
                          id={`fc-label-${criterion.key}`}
                          value={criterion.label}
                          disabled={isPending}
                          onChange={(e) =>
                            patchCriterion(criterion.key, {
                              label: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`fc-weight-${criterion.key}`}>
                          Peso (%)
                        </Label>
                        <Input
                          id={`fc-weight-${criterion.key}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={100}
                          step={1}
                          value={criterion.weight}
                          disabled={isPending}
                          onChange={(e) => {
                            const v =
                              e.target.value === '' ? 0 : Number(e.target.value);
                            if (Number.isNaN(v)) return;
                            patchCriterion(criterion.key, {
                              weight: Math.max(0, Math.min(100, v)),
                            });
                          }}
                          className="text-right font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`fc-question-${criterion.key}`}>
                        Pregunta (lo que ve el jurado)
                      </Label>
                      <Textarea
                        id={`fc-question-${criterion.key}`}
                        value={criterion.question}
                        disabled={isPending}
                        maxLength={800}
                        onChange={(e) =>
                          patchCriterion(criterion.key, {
                            question: e.target.value,
                          })
                        }
                        className="min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Qué significa cada estrella
                      </p>
                      {criterion.starMeanings.map((meaning) => (
                        <div
                          key={meaning.stars}
                          className="grid gap-2 rounded-md border bg-card p-3 sm:grid-cols-[90px_180px_1fr]"
                        >
                          <div className="flex items-center gap-1 text-sm font-semibold">
                            {meaning.stars}
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          </div>
                          <Input
                            value={meaning.label}
                            disabled={isPending}
                            maxLength={80}
                            placeholder="Etiqueta corta"
                            onChange={(e) =>
                              patchStarMeaning(criterion.key, meaning.stars, {
                                label: e.target.value,
                              })
                            }
                          />
                          <Textarea
                            value={meaning.description}
                            disabled={isPending}
                            maxLength={400}
                            placeholder="Aclaración de qué significa asignar esta puntuación"
                            onChange={(e) =>
                              patchStarMeaning(criterion.key, meaning.stars, {
                                description: e.target.value,
                              })
                            }
                            className="min-h-[44px]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {!weightsValid && (
        <p className="mt-3 text-sm font-medium text-amber-700">
          Los cinco pesos deben sumar exactamente 100. Actualmente suman{' '}
          {totalWeight}.
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!weightsValid || !isDirty || isPending}
          className="gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isPending ? 'Guardando…' : 'Guardar criterios finales'}
        </Button>
      </div>
    </Card>
  );
}
