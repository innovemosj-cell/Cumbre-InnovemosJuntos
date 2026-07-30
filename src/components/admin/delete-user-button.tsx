'use client';

// Botón de borrado de un perfil (panel admin) con diálogo de confirmación.
// Llama a POST /api/delete-user (API Route, no Server Action, por el bug
// de CF Pages). Las calificaciones ya emitidas por el usuario se conservan.

import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import type { User } from '@/lib/types';

export function DeleteUserButton({
  user,
  disabled,
  onDeleted,
}: {
  user: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  disabled?: boolean;
  onDeleted: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleDelete() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        let msg = 'No se pudo borrar el usuario.';
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {}
        toast({ variant: 'destructive', title: 'Error', description: msg });
        return;
      }
      toast({
        title: 'Perfil borrado',
        description: `${user.name || 'El usuario'} ya no puede ingresar.`,
      });
      setOpen(false);
      onDeleted(user.id);
    } catch (e: any) {
      console.error('[delete-user] error', { message: e?.message });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo borrar el usuario. Intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={`Borrar perfil de ${user.name || 'usuario'}`}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar este perfil?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Vas a borrar el perfil de{' '}
                <strong className="text-foreground">
                  {user.name || 'usuario sin nombre'}
                </strong>{' '}
                ({user.email || 'sin correo'}, rol {user.role}). La persona
                perderá el acceso a la aplicación.
              </p>
              <p>
                Esta acción no se puede deshacer. Las calificaciones que ya
                haya enviado se conservan en los resultados.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Borrando…' : 'Sí, borrar perfil'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
