'use client';

// Controles del admin para la votación del público: abrir/cerrar la
// votación, copiar el enlace público y borrar todos los votos.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteAllPublicVotesAction,
  setPublicVotingOpenAction,
} from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Megaphone,
  Trash2,
} from 'lucide-react';

export function PublicVotingControls({
  open,
  publicUrl,
  resultsUrl,
}: {
  open: boolean;
  publicUrl: string;
  resultsUrl: string;
}) {
  const [isOpen, setIsOpen] = useState(open);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const isMatch = confirmText.trim().toUpperCase() === 'BORRAR';

  const handleToggle = (next: boolean) => {
    setIsOpen(next);
    startTransition(async () => {
      const result = await setPublicVotingOpenAction(next);
      if (result.success) {
        toast({
          title: next ? 'Votación abierta' : 'Votación cerrada',
          description: result.message,
        });
        router.refresh();
      } else {
        setIsOpen(!next);
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'No se pudo copiar',
        description: publicUrl,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteAllPublicVotesAction(
        confirmText.trim().toUpperCase()
      );
      if (result.success) {
        toast({ title: 'Votos borrados', description: result.message });
        setConfirmText('');
        setDialogOpen(false);
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
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Megaphone className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="font-headline text-lg font-semibold">
              Control de la votación
            </h2>
            <p className="text-sm text-muted-foreground">
              Comparte el enlace con el público y abre la votación cuando el
              presentador lo indique.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
              {publicUrl}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar enlace
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Panel público de resultados (top 3)
              </p>
              <p className="text-xs text-muted-foreground">
                Para proyectar en pantalla: total de votos y podio en vivo.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" asChild className="gap-2">
              <a href={resultsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Abrir panel
              </a>
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label htmlFor="voting-open" className="text-sm font-semibold">
                {isOpen ? 'Votación abierta' : 'Votación cerrada'}
              </Label>
              <p className="text-xs text-muted-foreground">
                Los asistentes ven el cambio en máximo 30 segundos.
              </p>
            </div>
            <Switch
              id="voting-open"
              checked={isOpen}
              onCheckedChange={handleToggle}
              disabled={isPending}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-destructive">
                Borrar todos los votos del público
              </p>
              <p className="text-xs text-muted-foreground">
                No toca las calificaciones de los jurados. No se puede deshacer.
              </p>
            </div>
            <AlertDialog
              open={dialogOpen}
              onOpenChange={(o) => {
                setDialogOpen(o);
                if (!o) setConfirmText('');
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Borrar votos
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    ¿Borrar todos los votos del público?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 pt-2">
                      <p>
                        Se eliminarán <strong>todos los votos del público</strong>.
                        Las calificaciones de los jurados no se tocan.{' '}
                        <strong>Esta acción no se puede deshacer.</strong>
                      </p>
                      <p>
                        Para confirmar, escribe{' '}
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-destructive">
                          BORRAR
                        </code>{' '}
                        en el campo de abajo.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="delete-votes-confirm" className="text-sm font-medium">
                    Confirmación
                  </Label>
                  <Input
                    id="delete-votes-confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="BORRAR"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isPending}
                    className="font-mono"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={!isMatch || isPending}
                    className="gap-2"
                  >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? 'Borrando…' : 'Sí, borrar votos'}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Card>
  );
}
