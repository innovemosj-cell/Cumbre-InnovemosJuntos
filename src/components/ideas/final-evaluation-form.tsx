'use client';

// Formulario de la EVALUACIÓN FINAL: 5 criterios calificados con 1 a 5
// estrellas, con la pregunta completa visible. La aclaración de cada
// estrella se muestra en la leyenda bajo las estrellas (sin popups
// flotantes, que se recortaban).

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import type { FinalCriterionKey, Idea } from '@/lib/types';
import {
  FINAL_OBSERVATIONS_MAX,
  type FinalCriterion,
} from '@/lib/final-criteria';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Loader2, Send, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type Scores = Partial<Record<FinalCriterionKey, number>>;

function StarRating({
  criterion,
  value,
  onChange,
}: {
  criterion: FinalCriterion;
  value: number | undefined;
  onChange: (stars: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  // La leyenda sigue la estrella bajo el cursor; si no hay hover, muestra
  // la seleccionada.
  const previewStars = hovered ?? value ?? null;
  const preview =
    previewStars !== null
      ? criterion.starMeanings.find((m) => m.stars === previewStars)
      : undefined;

  return (
    <div>
      <div
        className="flex items-center gap-1 sm:gap-2"
        role="radiogroup"
        aria-label={`Estrellas para ${criterion.label}`}
        onMouseLeave={() => setHovered(null)}
      >
        {criterion.starMeanings.map((meaning) => {
          const filled =
            hovered !== null ? meaning.stars <= hovered : meaning.stars <= (value ?? 0);
          return (
            <button
              key={meaning.stars}
              type="button"
              role="radio"
              aria-checked={value === meaning.stars}
              aria-label={`${meaning.stars} ${meaning.stars === 1 ? 'estrella' : 'estrellas'}: ${meaning.label}`}
              onClick={() => onChange(meaning.stars)}
              onMouseEnter={() => setHovered(meaning.stars)}
              onFocus={() => setHovered(meaning.stars)}
              onBlur={() => setHovered(null)}
              className="flex h-11 w-11 items-center justify-center rounded-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-12 sm:w-12"
            >
              <Star
                className={cn(
                  'h-8 w-8 transition-colors sm:h-9 sm:w-9',
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-muted-foreground/40'
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Leyenda con el significado de la estrella señalada o seleccionada */}
      <div
        className={cn(
          'mt-3 min-h-[3.25rem] rounded-lg border px-3 py-2 transition-colors',
          preview
            ? 'border-amber-200 bg-amber-50'
            : 'border-dashed border-muted-foreground/30 bg-muted/20'
        )}
        aria-live="polite"
      >
        {preview ? (
          <>
            <p className="text-xs font-bold text-amber-900">
              {preview.stars} {preview.stars === 1 ? 'estrella' : 'estrellas'} · {preview.label}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-amber-900/80">
              {preview.description}
            </p>
          </>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            Pasa el cursor o toca una estrella para ver qué significa cada
            puntuación.
          </p>
        )}
      </div>
    </div>
  );
}

export function FinalEvaluationForm({
  idea,
  jurorId,
  criteria,
  hasRated,
}: {
  idea: Idea;
  jurorId: string;
  criteria: FinalCriterion[];
  hasRated: boolean;
}) {
  const existing = idea.finalRatings?.[jurorId];
  const [scores, setScores] = useState<Scores>(existing?.scores ?? {});
  const [observations, setObservations] = useState(existing?.observations ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const completed = criteria.filter((c) => (scores[c.key] ?? 0) > 0).length;
  const total = criteria.length;
  const isComplete = completed === total;

  function handleSubmit() {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/final-ratings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ideaId: idea.id,
            jurorId,
            scores,
            observations,
          }),
        });

        let body: any = null;
        try {
          body = await res.json();
        } catch {
          // respuesta no JSON
        }

        if (!res.ok || body?.error) {
          const msg = body?.error ?? `Error ${res.status}.`;
          setErrorMsg(msg);
          toast({
            variant: 'destructive',
            title: 'Error al enviar',
            description: msg,
          });
          return;
        }

        setConfirmOpen(false);
        toast({
          title: hasRated ? 'Calificación actualizada' : 'Calificación enviada',
          description: 'Gracias por tu evaluación.',
        });
        router.push('/dashboard');
        router.refresh();
      } catch (e: any) {
        console.error('submit final rating error:', {
          name: e?.name,
          message: e?.message,
        });
        setErrorMsg('No se pudo enviar la calificación. Intenta de nuevo.');
      }
    });
  }

  return (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="font-headline text-xl">
                {hasRated ? 'Actualizar Evaluación Final' : 'Evaluación Final'}
              </CardTitle>
              <CardDescription>
                Califica cada criterio de 1 a 5 estrellas. Cada estrella tiene
                una aclaración de lo que significa.
              </CardDescription>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-right">
              <p className="text-xs text-muted-foreground">Progreso</p>
              <p className="font-headline text-lg font-semibold">
                {completed}/{total}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {criteria.map((criterion, index) => {
            const selected = scores[criterion.key];
            return (
              <section
                key={criterion.key}
                className="rounded-xl border bg-card p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {index + 1}
                    </span>
                    <h3 className="font-headline text-base font-semibold sm:text-lg">
                      {criterion.label}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      Peso {criterion.weight}%
                    </Badge>
                  </div>
                  {selected && (
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {criterion.question}
                </p>
                <div className="mt-4">
                  <StarRating
                    criterion={criterion}
                    value={selected}
                    onChange={(stars) =>
                      setScores((prev) => ({ ...prev, [criterion.key]: stars }))
                    }
                  />
                </div>
              </section>
            );
          })}

          <div className="space-y-2 pt-1">
            <label htmlFor="final-observations" className="text-sm font-medium leading-none">
              Observaciones (opcional)
            </label>
            <Textarea
              id="final-observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Comparte cualquier comentario adicional sobre la iniciativa..."
              maxLength={FINAL_OBSERVATIONS_MAX}
              className="min-h-[100px]"
            />
            <p className="text-right text-xs text-muted-foreground">
              {observations.length}/{FINAL_OBSERVATIONS_MAX}
            </p>
          </div>

          {errorMsg && (
            <Alert variant="destructive">
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <AlertDialogTrigger asChild>
            <Button type="button" className="w-full" disabled={!isComplete || isPending}>
              {hasRated ? 'Revisar y Actualizar' : 'Revisar y Enviar'}
            </Button>
          </AlertDialogTrigger>
        </CardFooter>
      </Card>

      <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {hasRated ? 'Confirmar Actualización' : 'Confirmar Calificación'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Revisa tu calificación antes de enviarla. Podrás modificarla más
            tarde si lo necesitas.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 space-y-3">
          {criteria.map((c) => {
            const selected = scores[c.key];
            const meaning = c.starMeanings.find((m) => m.stars === selected);
            return (
              <div
                key={c.key}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <span className="flex-1 font-medium leading-tight">{c.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-3.5 w-3.5',
                          i < (selected ?? 0)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-transparent text-muted-foreground/40'
                        )}
                      />
                    ))}
                  </span>
                  <Badge variant="secondary">{meaning?.label}</Badge>
                </span>
              </div>
            );
          })}
          {observations && (
            <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Observaciones
              </p>
              <p className="text-sm italic">{observations}</p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />{' '}
                {hasRated ? 'Actualizar Calificación' : 'Enviar Calificación'}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
