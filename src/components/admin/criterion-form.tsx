'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Criterion, FrenteKey } from '@/lib/types';
import { upsertCriterionAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const formSchema = z.object({
  id: z
    .string()
    .min(2, 'Id muy corto.')
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones.'),
  frente: z.enum(['estrategia', 'impacto', 'innovacion', 'tecnico']),
  label: z.string().min(3, 'Etiqueta muy corta.'),
  description: z.string().min(5, 'Descripción muy corta.'),
  weight: z.coerce.number().min(0).max(100),
  order: z.coerce.number().int().min(0),
  levels: z
    .array(
      z.object({
        score: z.coerce.number().int().min(1).max(99),
        label: z.string().min(1, 'Etiqueta obligatoria.'),
        description: z.string().optional().or(z.literal('')),
      })
    )
    .min(2),
});

type FormValues = z.infer<typeof formSchema>;

const FRENTE_OPTIONS: { value: FrenteKey; label: string }[] = [
  { value: 'estrategia', label: 'Estrategia' },
  { value: 'impacto', label: 'Impacto' },
  { value: 'innovacion', label: 'Innovación' },
  { value: 'tecnico', label: 'Técnico' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const DEFAULT_LEVELS = [
  { score: 1, label: 'Bajo', description: '' },
  { score: 3, label: 'Medio', description: '' },
  { score: 5, label: 'Alto', description: '' },
];

export function CriterionForm({
  open,
  onOpenChange,
  criterion,
  defaultFrente,
  defaultOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criterion?: Criterion;
  defaultFrente?: FrenteKey;
  defaultOrder?: number;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [autoId, setAutoId] = useState(!criterion);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: criterion
      ? {
          id: criterion.id,
          frente: criterion.frente,
          label: criterion.label,
          description: criterion.description,
          weight: criterion.weight,
          order: criterion.order,
          levels: criterion.levels,
        }
      : {
          id: '',
          frente: defaultFrente ?? 'estrategia',
          label: '',
          description: '',
          weight: 25,
          order: defaultOrder ?? 99,
          levels: DEFAULT_LEVELS,
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'levels',
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      criterion
        ? {
            id: criterion.id,
            frente: criterion.frente,
            label: criterion.label,
            description: criterion.description,
            weight: criterion.weight,
            order: criterion.order,
            levels: criterion.levels,
          }
        : {
            id: '',
            frente: defaultFrente ?? 'estrategia',
            label: '',
            description: '',
            weight: 25,
            order: defaultOrder ?? 99,
            levels: DEFAULT_LEVELS,
          }
    );
    setAutoId(!criterion);
  }, [open, criterion, defaultFrente, defaultOrder, form]);

  const watchLabel = form.watch('label');
  useEffect(() => {
    if (autoId && watchLabel) {
      const slug = slugify(watchLabel);
      if (slug) form.setValue('id', slug.slice(0, 60));
    }
  }, [watchLabel, autoId, form]);

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await upsertCriterionAction(
        { ...data, key: data.id.replace(/-/g, '_') },
        criterion?.id
      );
      if (result.success) {
        toast({ title: 'Guardado', description: result.message });
        onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {criterion ? 'Editar criterio' : 'Nuevo criterio'}
          </DialogTitle>
          <DialogDescription>
            Define qué evalúa, su peso dentro del frente y los niveles de la
            escala.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nombre del criterio *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Alineación estratégica"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frente *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FRENTE_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso dentro del frente (%) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ID
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (auto desde el nombre)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          setAutoId(false);
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>¿Qué evalúa? *</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-20"
                        placeholder="Describe qué mide este criterio..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-headline text-sm font-semibold">Niveles</p>
                  <p className="text-xs text-muted-foreground">
                    Cada nivel es una tarjeta de respuesta que el jurado podrá
                    seleccionar.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      score: (fields[fields.length - 1]?.score ?? 0) + 1,
                      label: '',
                      description: '',
                    })
                  }
                  disabled={fields.length >= 7}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Nivel
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((row, idx) => (
                  <div
                    key={row.id}
                    className="grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-[80px_1fr_auto]"
                  >
                    <FormField
                      control={form.control}
                      name={`levels.${idx}.score`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Puntaje</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} max={99} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name={`levels.${idx}.label`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Etiqueta del nivel
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ej: Alineación alta"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`levels.${idx}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Descripción
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                className="min-h-12 text-sm"
                                placeholder="Qué significa otorgar este puntaje..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => remove(idx)}
                        disabled={fields.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  'Guardar criterio'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
