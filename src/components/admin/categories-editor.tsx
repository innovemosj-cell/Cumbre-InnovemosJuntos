'use client';

// Editor de las categorías de competencia: el admin puede cambiar el título
// y la descripción de cada una. Las iniciativas se asocian a una categoría
// desde su formulario de edición, y la evaluación final premia 1 ganador
// por categoría.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/lib/types';
import { updateCategoriesAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Layers, Loader2, Save } from 'lucide-react';

export function CategoriesEditor({ initial }: { initial: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initial);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const isDirty = JSON.stringify(categories) !== JSON.stringify(initial);
  const allValid = categories.every((c) => c.title.trim().length >= 3);

  function patchCategory(id: string, patch: Partial<Category>) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  const handleSave = () => {
    if (!allValid) return;
    startTransition(async () => {
      const result = await updateCategoriesAction(categories);
      if (result.success) {
        toast({ title: 'Categorías guardadas', description: result.message });
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
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
          <Layers className="h-4 w-4 text-violet-600" />
        </div>
        <div>
          <h2 className="font-headline text-lg font-semibold">
            Categorías de competencia
          </h2>
          <p className="text-sm text-muted-foreground">
            Edita el título y la descripción de cada categoría. Las iniciativas
            se asocian a una categoría desde su formulario, y en la evaluación
            final hay 1 ganador por categoría.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((category, index) => (
          <div key={category.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {index + 1}
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Categoría {index + 1}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`cat-title-${category.id}`}>Título</Label>
              <Input
                id={`cat-title-${category.id}`}
                value={category.title}
                disabled={isPending}
                maxLength={120}
                placeholder="Nombre de la categoría"
                onChange={(e) =>
                  patchCategory(category.id, { title: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`cat-desc-${category.id}`}>Descripción</Label>
              <Textarea
                id={`cat-desc-${category.id}`}
                value={category.description}
                disabled={isPending}
                maxLength={600}
                placeholder="Qué tipo de iniciativas compiten en esta categoría"
                onChange={(e) =>
                  patchCategory(category.id, { description: e.target.value })
                }
                className="min-h-[80px]"
              />
            </div>
          </div>
        ))}
      </div>

      {!allValid && (
        <p className="mt-3 text-sm font-medium text-amber-700">
          Cada categoría debe tener un título de al menos 3 caracteres.
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!allValid || !isDirty || isPending}
          className="gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isPending ? 'Guardando…' : 'Guardar categorías'}
        </Button>
      </div>
    </Card>
  );
}
