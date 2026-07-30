'use client';

// Zona crítica del admin: reiniciar votos. Cada modo tiene su propio botón
// y su propia palabra de confirmación, porque los votos se guardan por
// separado (ratings = preselección, finalRatings = evaluación final).

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  resetAllRatingsAction,
  resetAllFinalRatingsAction,
} from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { AlertTriangle, Loader2, RotateCcw, Star } from 'lucide-react';

function ResetDialog({
  triggerLabel,
  triggerIcon: TriggerIcon,
  title,
  warning,
  confirmWord,
  successTitle,
  action,
}: {
  triggerLabel: string;
  triggerIcon: typeof RotateCcw;
  title: string;
  warning: React.ReactNode;
  confirmWord: string;
  successTitle: string;
  action: (confirmation: string) => Promise<{ success: boolean; message: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const isMatch = confirmText.trim().toUpperCase() === confirmWord;
  const inputId = `reset-confirm-${confirmWord.toLowerCase()}`;

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await action(confirmText.trim().toUpperCase());
      if (result.success) {
        toast({ title: successTitle, description: result.message });
        setConfirmText('');
        setOpen(false);
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
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setConfirmText('');
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <TriggerIcon className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              {warning}
              <p>
                Para confirmar, escribe{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-destructive">
                  {confirmWord}
                </code>{' '}
                en el campo de abajo.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor={inputId} className="text-sm font-medium">
            Confirmación
          </Label>
          <Input
            id={inputId}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmWord}
            autoComplete="off"
            spellCheck={false}
            disabled={isPending}
            className="font-mono"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isMatch || isPending}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? 'Borrando…' : 'Sí, continuar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ResetVotesButton() {
  return (
    <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-headline text-base font-semibold text-destructive">
            Zona crítica
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada evaluación guarda sus votos por separado; borra solo los que
            necesites. Ninguna de estas acciones se puede deshacer.
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-background/60 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Votos de preselección</p>
                <p className="text-xs text-muted-foreground">
                  Calificaciones por frentes y criterios con niveles.
                </p>
              </div>
              <ResetDialog
                triggerLabel="Reiniciar preselección"
                triggerIcon={RotateCcw}
                title="¿Reiniciar los votos de preselección?"
                warning={
                  <p>
                    Se eliminarán <strong>todas las calificaciones de la
                    preselección</strong> (frentes y criterios), incluidas las
                    observaciones de los jurados. Los votos de la evaluación
                    final no se tocan.{' '}
                    <strong>Esta acción no se puede deshacer.</strong>
                  </p>
                }
                confirmWord="REINICIAR"
                successTitle="Votos de preselección reiniciados"
                action={resetAllRatingsAction}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-background/60 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  Votos de la evaluación final
                </p>
                <p className="text-xs text-muted-foreground">
                  Calificaciones con estrellas de las iniciativas finalistas.
                </p>
              </div>
              <ResetDialog
                triggerLabel="Borrar evaluación final"
                triggerIcon={Star}
                title="¿Borrar los votos de la evaluación final?"
                warning={
                  <p>
                    Se eliminarán <strong>todas las calificaciones con
                    estrellas de la evaluación final</strong>, incluidas las
                    observaciones de los jurados. Los votos de la preselección
                    no se tocan.{' '}
                    <strong>Esta acción no se puede deshacer.</strong>
                  </p>
                }
                confirmWord="BORRAR"
                successTitle="Votos de evaluación final borrados"
                action={resetAllFinalRatingsAction}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
