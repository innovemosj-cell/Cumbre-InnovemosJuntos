'use client';

// Selector del modo global de la app: Preselección (criterios por frente)
// o Evaluación Final (5 preguntas con estrellas para elegir los ganadores).
// Los datos de cada modo se guardan por separado, así que cambiar de modo
// no borra nada.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AppMode } from '@/lib/types';
import { updateAppModeAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ClipboardList, Loader2, Star, ToggleRight } from 'lucide-react';

const MODES: {
  key: AppMode;
  label: string;
  description: string;
  icon: typeof Star;
}[] = [
  {
    key: 'preseleccion',
    label: 'Modo Preselección',
    description:
      'Evaluación por frentes y criterios con niveles. Se usó para elegir las 10 mejores iniciativas.',
    icon: ClipboardList,
  },
  {
    key: 'final',
    label: 'Modo Evaluación Final',
    description:
      'Evaluación con 5 preguntas de 1 a 5 estrellas para escoger las 3 ideas ganadoras.',
    icon: Star,
  },
];

export function AppModeSwitcher({ current }: { current: AppMode }) {
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const confirmChange = () => {
    if (!pendingMode) return;
    const mode = pendingMode;
    startTransition(async () => {
      const result = await updateAppModeAction({ mode });
      setPendingMode(null);
      if (result.success) {
        toast({ title: 'Modo actualizado', description: result.message });
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

  const pendingLabel = MODES.find((m) => m.key === pendingMode)?.label;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ToggleRight className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-headline text-lg font-semibold">Modo de la app</h2>
          <p className="text-sm text-muted-foreground">
            Define qué evaluación ven los jurados. Cada modo guarda sus
            calificaciones por separado: cambiar de modo no borra lo ya
            construido.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((mode) => {
          const active = current === mode.key;
          const Icon = mode.icon;
          return (
            <button
              key={mode.key}
              type="button"
              disabled={isPending || active}
              onClick={() => setPendingMode(mode.key)}
              className={cn(
                'flex flex-col rounded-lg border p-4 text-left transition-all',
                active
                  ? 'border-transparent bg-primary/5 ring-2 ring-primary'
                  : 'hover:border-foreground/40 hover:shadow-sm disabled:opacity-60'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold">
                  <Icon className="h-4 w-4" />
                  {mode.label}
                </span>
                {active && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    Activo
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-snug text-muted-foreground">
                {mode.description}
              </p>
            </button>
          );
        })}
      </div>

      {current === 'final' && (
        <p className="mt-3 text-xs text-muted-foreground">
          Nota: las preguntas, pesos y textos de las estrellas de la
          Evaluación Final se editan en la sección de abajo. Los pesos por
          frente y los criterios con niveles aplican solo al modo
          Preselección.
        </p>
      )}

      <AlertDialog
        open={pendingMode !== null}
        onOpenChange={(open) => {
          if (!open) setPendingMode(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Activar {pendingLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              Los jurados verán la evaluación de este modo desde su próxima
              carga de página. Las calificaciones del otro modo quedan
              guardadas intactas y puedes volver cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmChange();
              }}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cambiando…
                </>
              ) : (
                'Sí, cambiar modo'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
