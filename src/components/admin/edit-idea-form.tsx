'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Idea } from '@/lib/types';

const editIdeaSchema = z.object({
  nombreSolucion: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(200),
  postulante: z.string().trim().max(200).optional().or(z.literal('')),
  codigo: z.string().trim().max(40).optional().or(z.literal('')),
  group: z.string().trim().max(200).optional().or(z.literal('')),
  area: z.string().trim().max(200).optional().or(z.literal('')),
  problema: z.string().trim().max(4000).optional().or(z.literal('')),
  contextoActual: z.string().trim().max(4000).optional().or(z.literal('')),
  beneficiarios: z.string().trim().max(2000).optional().or(z.literal('')),
  relevancia: z.string().trim().max(2000).optional().or(z.literal('')),
  hipotesisIA: z.string().trim().max(4000).optional().or(z.literal('')),
  escenarioFuturo: z.string().trim().max(4000).optional().or(z.literal('')),
  indicadoresValor: z.string().trim().max(4000).optional().or(z.literal('')),
  eficienciaFTE: z
    .string()
    .trim()
    .max(150, 'Máximo 150 caracteres.')
    .optional()
    .or(z.literal('')),
  detalleEficiencia: z.string().trim().max(8000).optional().or(z.literal('')),
  nivelMadurez: z.string().trim().max(4000).optional().or(z.literal('')),
  resumenEjecutivo: z.string().trim().max(8000).optional().or(z.literal('')),
  puntosFuertes: z.string().trim().max(8000).optional().or(z.literal('')),
  aspectosAMejorar: z.string().trim().max(8000).optional().or(z.literal('')),
  tecnologiasRecomendadas: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .or(z.literal('')),
  riesgo: z.string().trim().max(4000).optional().or(z.literal('')),
  manejaDatosSensibles: z.string().trim().max(4000).optional().or(z.literal('')),
  distribucionValor: z.string().trim().max(4000).optional().or(z.literal('')),
  imageUrl: z
    .string()
    .trim()
    .max(1024)
    .refine(
      (v) => v === '' || /^https?:\/\//i.test(v),
      'La URL de la foto debe empezar con http:// o https://'
    )
    .optional()
    .or(z.literal('')),
});

type EditIdeaValues = z.infer<typeof editIdeaSchema>;

function isPicsumPlaceholder(url: string | undefined): boolean {
  if (!url) return false;
  return /picsum\.photos/i.test(url);
}

const RIESGO_OPTIONS = ['Bajo', 'Medio', 'Alto'] as const;
const DATOS_OPTIONS = ['Sí', 'No', 'Parcial', 'No aplica'] as const;

function detectOption<T extends readonly string[]>(
  raw: string | undefined,
  options: T
): T[number] | '' {
  if (!raw) return '';
  const exact = options.find((o) => o.toLowerCase() === raw.trim().toLowerCase());
  if (exact) return exact;
  const first = raw.trim().split(/[\s\n—-]+/)[0]?.toLowerCase() ?? '';
  const match = options.find((o) => o.toLowerCase() === first);
  return match ?? '';
}

function pickInitial(idea: Idea): EditIdeaValues {
  return {
    nombreSolucion: idea.nombreSolucion ?? idea.name ?? '',
    postulante: idea.postulante ?? '',
    codigo: idea.codigo ?? '',
    group: idea.group ?? '',
    area: idea.area ?? '',
    problema: idea.problema ?? '',
    contextoActual: idea.contextoActual ?? '',
    beneficiarios: idea.beneficiarios ?? '',
    relevancia: idea.relevancia ?? '',
    hipotesisIA: idea.hipotesisIA ?? '',
    escenarioFuturo: idea.escenarioFuturo ?? '',
    indicadoresValor: idea.indicadoresValor ?? '',
    eficienciaFTE: idea.eficienciaFTE ?? '',
    detalleEficiencia: idea.detalleEficiencia ?? '',
    nivelMadurez: idea.nivelMadurez ?? '',
    resumenEjecutivo: idea.resumenEjecutivo ?? '',
    puntosFuertes: idea.puntosFuertes ?? '',
    aspectosAMejorar: idea.aspectosAMejorar ?? '',
    tecnologiasRecomendadas: idea.tecnologiasRecomendadas ?? '',
    riesgo: idea.riesgo ?? '',
    manejaDatosSensibles: idea.manejaDatosSensibles ?? '',
    distribucionValor: idea.distribucionValor ?? '',
    imageUrl: isPicsumPlaceholder(idea.imageUrl) ? '' : idea.imageUrl ?? '',
  };
}

type Props = {
  idea: Idea;
};

export function EditIdeaForm({ idea }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initial = pickInitial(idea);
  const [previewUrl, setPreviewUrl] = useState(initial.imageUrl ?? '');

  const form = useForm<EditIdeaValues>({
    resolver: zodResolver(editIdeaSchema),
    defaultValues: initial,
  });

  const onSubmit = (data: EditIdeaValues) => {
    startTransition(async () => {
      // API Route en lugar de server action: las actions fallan en CF Pages
      // + next-on-pages (POST 404 → "unexpected response" en el cliente).
      try {
        const res = await fetch('/api/update-idea', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ideaId: idea.id, data }),
        });
        const body = await res.json().catch(() => null);
        if (res.ok && body?.success) {
          toast({ title: 'Listo', description: body.message });
          router.push('/admin/iniciativas');
          router.refresh();
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description:
              body?.error ?? 'No se pudo actualizar la iniciativa. Intenta de nuevo.',
          });
        }
      } catch (error) {
        console.error('[edit-idea] error al guardar:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo actualizar la iniciativa. Intenta de nuevo.',
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" type="button">
            <Link href="/admin/iniciativas">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver al listado
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              type="button"
            >
              <Link href={`/ideas/${idea.id}`} target="_blank">
                Ver detalle
              </Link>
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar cambios
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-base">
              Identificación
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nombreSolucion"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nombre de la solución *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: INI-007" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="postulante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postulante</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="group"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipo general</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: EMPRESAS" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Área</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: ASESORÍA PROPUESTA DE VALOR"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-base">
              Foto del equipo
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[1fr,260px]">
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de la foto</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://..."
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setPreviewUrl(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Usa una imagen alojada (Drive público, Imgur, Cloudinary) o
                    sube una a Firebase Storage. Idealmente 16:9.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="aspect-[16/9] w-full overflow-hidden rounded-md border bg-gradient-to-br from-sky-100 via-violet-50 to-rose-50">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-base">
              Descripción de la iniciativa
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <FormField
              control={form.control}
              name="problema"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Problema</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hipotesisIA"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hipótesis de IA</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="indicadoresValor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indicadores de valor</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contextoActual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contexto actual</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="beneficiarios"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beneficiarios</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="relevancia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relevancia</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="escenarioFuturo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Escenario futuro</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-base">
              Impacto y eficiencia
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <FormField
              control={form.control}
              name="eficienciaFTE"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Impacto en eficiencia</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: 480 horas mensuales ahorradas en el área"
                      className="min-h-20"
                      maxLength={150}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Texto libre, máximo 150 caracteres. Preferiblemente muestra
                    el ahorro mensual y el impacto, de forma puntual.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="detalleEficiencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalle de eficiencia</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-base">
              Análisis (solo organizador)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <FormField
              control={form.control}
              name="resumenEjecutivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resumen ejecutivo</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-28" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="puntosFuertes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puntos fuertes</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aspectosAMejorar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aspectos a mejorar</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="tecnologiasRecomendadas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tecnologías recomendadas</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nivelMadurez"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nivel de madurez</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Sólida — IA robusta. Análisis: ..."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-base">
              Riesgo y datos
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="riesgo"
              render={({ field }) => {
                const detected = detectOption(field.value, RIESGO_OPTIONS);
                const showRawHint =
                  !!field.value && !detected && field.value !== detected;
                return (
                  <FormItem>
                    <FormLabel>Riesgo</FormLabel>
                    <Select
                      value={detected || undefined}
                      onValueChange={(v) => field.onChange(v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el nivel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RIESGO_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showRawHint && (
                      <FormDescription>
                        Valor actual sin clasificar:{' '}
                        <span className="italic">“{field.value}”</span>. Se
                        reemplazará al elegir un nivel.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="manejaDatosSensibles"
              render={({ field }) => {
                const detected = detectOption(field.value, DATOS_OPTIONS);
                const showRawHint =
                  !!field.value && !detected && field.value !== detected;
                return (
                  <FormItem>
                    <FormLabel>Maneja datos sensibles</FormLabel>
                    <Select
                      value={detected || undefined}
                      onValueChange={(v) => field.onChange(v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una opción" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DATOS_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showRawHint && (
                      <FormDescription>
                        Valor actual sin clasificar:{' '}
                        <span className="italic">“{field.value}”</span>. Se
                        reemplazará al elegir una opción.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="distribucionValor"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Distribución del valor</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2 pb-4">
          <Button asChild variant="outline" type="button">
            <Link href="/admin/iniciativas">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar cambios
          </Button>
        </div>
      </form>
    </Form>
  );
}
