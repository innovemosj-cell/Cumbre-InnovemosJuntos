'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { FrenteKey, RatingWeights } from '@/lib/types';
import { updateRatingWeightsAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, RotateCcw, Save, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

const FRENTE_META: Record<
  FrenteKey,
  { label: string; tint: string; bar: string; default: number }
> = {
  estrategia: {
    label: 'Estrategia',
    tint: 'border-sky-200 bg-sky-50',
    bar: 'bg-sky-500',
    default: 30,
  },
  impacto: {
    label: 'Impacto',
    tint: 'border-rose-200 bg-rose-50',
    bar: 'bg-rose-500',
    default: 25,
  },
  innovacion: {
    label: 'Innovación',
    tint: 'border-violet-200 bg-violet-50',
    bar: 'bg-violet-500',
    default: 15,
  },
  tecnico: {
    label: 'Técnico',
    tint: 'border-emerald-200 bg-emerald-50',
    bar: 'bg-emerald-500',
    default: 30,
  },
};

const FRENTES_ORDER: FrenteKey[] = ['estrategia', 'impacto', 'innovacion', 'tecnico'];

const DEFAULTS: RatingWeights = {
  estrategia: 30,
  impacto: 25,
  innovacion: 15,
  tecnico: 30,
};

export function FrenteWeightsEditor({ initial }: { initial: RatingWeights }) {
  const [weights, setWeights] = useState<RatingWeights>(initial);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const total = useMemo(
    () =>
      Math.round(
        (weights.estrategia + weights.impacto + weights.innovacion + weights.tecnico) *
          100
      ) / 100,
    [weights]
  );

  const isValid = Math.abs(total - 100) < 0.0001;
  const isDirty = FRENTES_ORDER.some((k) => weights[k] !== initial[k]);

  const handleChange = (key: FrenteKey, raw: string) => {
    const value = raw === '' ? 0 : Number(raw);
    if (Number.isNaN(value)) return;
    setWeights((prev) => ({ ...prev, [key]: Math.max(0, Math.min(100, value)) }));
  };

  const handleReset = () => setWeights(DEFAULTS);

  const handleSave = () => {
    if (!isValid) return;
    startTransition(async () => {
      const result = await updateRatingWeightsAction(weights);
      if (result.success) {
        toast({
          title: 'Pesos actualizados',
          description: result.message,
        });
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Scale className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-headline text-lg font-semibold">
              Pesos por frente
            </h2>
            <p className="text-sm text-muted-foreground">
              Define cuánto pesa cada frente en el puntaje final. Los cuatro
              valores deben sumar 100.
            </p>
          </div>
        </div>
        <div
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            isValid
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-800'
          )}
        >
          Total: {total}%
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FRENTES_ORDER.map((key) => {
          const meta = FRENTE_META[key];
          const value = weights[key];
          return (
            <div
              key={key}
              className={cn('rounded-lg border p-3', meta.tint)}
            >
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor={`weight-${key}`}
                  className="text-sm font-semibold"
                >
                  {meta.label}
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id={`weight-${key}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={1}
                    value={value}
                    onChange={(e) => handleChange(key, e.target.value)}
                    disabled={isPending}
                    className="h-9 w-20 text-right font-mono"
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/60">
                <div
                  className={cn('h-full transition-all', meta.bar)}
                  style={{ width: `${Math.min(100, value)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {!isValid && (
        <p className="mt-3 text-sm font-medium text-amber-700">
          Los cuatro pesos deben sumar exactamente 100. Actualmente suman {total}.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isPending}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Restaurar (30/25/15/30)
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!isValid || !isDirty || isPending}
          className="gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isPending ? 'Guardando…' : 'Guardar pesos'}
        </Button>
      </div>
    </Card>
  );
}
