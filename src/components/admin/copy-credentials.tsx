'use client';

import { User } from '@/lib/types';
import { Button } from '../ui/button';
import { ClipboardCopy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type CopyCredentialsProps = {
  user: User;
};

export function CopyCredentials({ user }: CopyCredentialsProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    const appUrl = window.location.origin;
    const message = `
      <div style="font-family: Poppins, sans-serif; color: hsl(var(--foreground)); background-color: hsl(var(--background)); padding: 20px; border-radius: 8px; border: 1px solid hsl(var(--border));">
        <h2 style="color: hsl(var(--primary)); font-size: 24px; font-family: Poppins, sans-serif;">Hola ${user.name},</h2>
        <p>Estos son los datos para el acceso a la aplicación CalificApp. A continuación encontrarás tus credenciales de acceso:</p>
        <div style="background-color: hsl(var(--card)); padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Rol:</strong> ${user.role}</p>
          <p><strong>Enlace de acceso:</strong> <a href="${appUrl}" style="color: hsl(var(--primary));">${appUrl}</a></p>
          <p><strong>Código de acceso:</strong> <strong style="font-size: 18px; font-family: monospace; color: hsl(var(--accent-foreground)); background-color: hsl(var(--accent)); padding: 5px 10px; border-radius: 5px;">${user.loginCode}</strong></p>
        </div>
        <p>¡Esperamos verte pronto!</p>
      </div>
    `;

    const blob = new Blob([message], { type: 'text/html' });
    const clipboardItem = new ClipboardItem({ 'text/html': blob });

    navigator.clipboard.write([clipboardItem]).then(
      () => {
        toast({
          title: 'Copiado al portapapeles',
          description: 'Las credenciales del usuario están listas para ser pegadas.',
        });
      },
      (err) => {
        toast({
          title: 'Error',
          description: 'No se pudieron copiar las credenciales.',
          variant: 'destructive',
        });
        console.error('Could not copy text: ', err);
      }
    );
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleCopy}>
      <ClipboardCopy className="h-4 w-4" />
    </Button>
  );
}
