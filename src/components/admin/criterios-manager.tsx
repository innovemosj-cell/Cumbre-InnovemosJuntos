'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Criterion, FrenteKey } from '@/lib/types';
import { deleteCriterionAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CriterionForm } from './criterion-form';
import { cn } from '@/lib/utils';
import { Loader2, Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react';

const FRENTE_META: Record<
  FrenteKey,
  { label: string; bar: string; chip: string; expectedWeight: number }
> = {
  estrategia: { label: 'Estrategia', bar: 'bg-sky-500', chip: 'bg-sky-100 text-sky-800 border-sky-200', expectedWeight: 30 },
  impacto: { label: 'Impacto', bar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800 border-rose-200', expectedWeight: 25 },
  innovacion: { label: 'Innovación', bar: 'bg-violet-500', chip: 'bg-violet-100 text-violet-800 border-violet-200', expectedWeight: 15 },
  tecnico: { label: 'Técnico', bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800 border-emerald-200', expectedWeight: 30 },
};

const FRENTES_ORDER: FrenteKey[] = ['estrategia', 'impacto', 'innovacion', 'tecnico'];

export function CriteriosManager({ criteria }: { criteria: Criterion[] }) {
  const [editing, setEditing] = useState<Criterion | undefined>(undefined);
  const [creating, setCreating] = useState<FrenteKey | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const grouped = useMemo(() => {
    const map = new Map<FrenteKey, Criterion[]>();
    for (const f of FRENTES_ORDER) map.set(f, []);
    for (const c of criteria) {
      const arr = map.get(c.frente) ?? [];
      arr.push(c);
      map.set(c.frente, arr);
    }
    for (const [, arr] of map) arr.sort((a, b) => a.order - b.order);
    return map;
  }, [criteria]);

  function handleEdit(c: Criterion) {
    setEditing(c);
    setCreating(null);
    setDialogOpen(true);
  }

  function handleCreate(frente: FrenteKey) {
    setEditing(undefined);
    setCreating(frente);
    setDialogOpen(true);
  }

  function handleDelete(c: Criterion) {
    setDeletingId(c.id);
    startTransition(async () => {
      const result = await deleteCriterionAction(c.id);
      setDeletingId(null);
      if (result.success) {
        toast({ title: 'Eliminado', description: result.message });
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      {FRENTES_ORDER.map((frente) => {
        const items = grouped.get(frente) ?? [];
        const meta = FRENTE_META[frente];
        const sumWeights = items.reduce((sum, c) => sum + c.weight, 0);
        const weightsOK = sumWeights === 100;

        return (
          <Card key={frente}>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={cn('h-3 w-3 rounded-full', meta.bar)} />
                  <h2 className="font-headline text-base font-semibold">
                    Frente {meta.label}
                  </h2>
                  <Badge variant="outline" className={cn('text-xs', meta.chip)}>
                    {items.length}{' '}
                    {items.length === 1 ? 'criterio' : 'criterios'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-mono',
                      weightsOK
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    )}
                  >
                    {sumWeights}% interno
                    {!weightsOK && (
                      <AlertTriangle className="ml-1 inline h-3 w-3" />
                    )}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCreate(frente)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Nuevo criterio
                </Button>
              </div>

              {!weightsOK && items.length > 0 && (
                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  La suma de pesos interna del frente debería ser 100%. Hoy es{' '}
                  <strong>{sumWeights}%</strong>. Los resultados se normalizan
                  igual, pero te conviene ajustarlo.
                </div>
              )}

              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                    No hay criterios en este frente todavía.
                  </p>
                )}
                {items.map((c) => {
                  const rowPending = deletingId === c.id && isPending;
                  return (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-start gap-3 rounded-lg border bg-card p-3"
                    >
                      <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
                        <span className="text-[10px] font-medium text-muted-foreground leading-none">
                          PESO
                        </span>
                        <span className="text-base font-bold leading-tight">
                          {c.weight}%
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-tight">{c.label}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {c.description}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {c.levels.map((l) => (
                            <Badge
                              key={l.score}
                              variant="outline"
                              className="font-mono text-[10px]"
                            >
                              {l.score} · {l.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(c)}
                          disabled={rowPending}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              disabled={rowPending}
                            >
                              {rowPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Eliminar criterio
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Vas a eliminar <strong>{c.label}</strong>.
                                <br />
                                <br />
                                Las calificaciones existentes que ya tengan un
                                puntaje para este criterio quedarán como dato
                                histórico, pero{' '}
                                <strong>
                                  no se contarán en los totales
                                </strong>{' '}
                                a partir de ahora.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(c)}
                                className="bg-rose-600 hover:bg-rose-700"
                              >
                                Sí, eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <CriterionForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        criterion={editing}
        defaultFrente={creating ?? undefined}
        defaultOrder={
          creating
            ? Math.max(
                0,
                ...((grouped.get(creating) ?? []).map((c) => c.order))
              ) + 1
            : undefined
        }
      />
    </div>
  );
}
