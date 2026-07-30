'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateIdeaImageAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Image as ImageIcon, Loader2, Trash2, Users } from 'lucide-react';

type Props = {
  ideaId: string;
  initialImageUrl?: string;
  onSaved?: (newUrl: string) => void;
};

// Detecta si la URL apunta al placeholder de picsum (decorativo del seed).
function isPlaceholder(url: string | undefined): boolean {
  if (!url) return true;
  return /picsum\.photos/i.test(url);
}

export function TeamPhotoEditor({
  ideaId,
  initialImageUrl,
  onSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(
    isPlaceholder(initialImageUrl) ? '' : (initialImageUrl ?? '')
  );
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setValue(isPlaceholder(initialImageUrl) ? '' : (initialImageUrl ?? ''));
    }
  }, [open, initialImageUrl]);

  const hasPhoto = !isPlaceholder(initialImageUrl);

  function submit(nextUrl: string) {
    startTransition(async () => {
      const res = await updateIdeaImageAction(ideaId, { imageUrl: nextUrl });
      if (res.success) {
        toast({ title: 'Listo', description: res.message });
        onSaved?.(res.imageUrl);
        setOpen(false);
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: res.message,
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          {hasPhoto ? 'Cambiar foto' : 'Foto del equipo'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Foto del equipo</DialogTitle>
          <DialogDescription>
            Pega la URL de una imagen del equipo (jpg, png o webp). Idealmente
            con relación 16:9 para que se vea bien en la tarjeta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="aspect-[16/9] w-full overflow-hidden rounded-md border bg-gradient-to-br from-sky-100 via-violet-50 to-rose-50">
            {value ? (
              <img
                src={value}
                alt="Vista previa"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
                onLoad={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'block';
                }}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-foreground/40">
                <Users className="h-10 w-10" />
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  Sin foto
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="team-photo-url" className="text-sm">
              URL de la imagen
            </Label>
            <Input
              id="team-photo-url"
              type="url"
              placeholder="https://..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isPending}
            />
            <p className="text-[11px] text-muted-foreground">
              Sugerencia: usa una imagen alojada (Drive público, Imgur,
              Cloudinary) o súbela a Firebase Storage.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {hasPhoto && (
            <Button
              type="button"
              variant="ghost"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => submit('')}
              disabled={isPending}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Quitar foto
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => submit(value.trim())}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
