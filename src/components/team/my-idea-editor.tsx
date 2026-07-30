'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  Info,
  Lightbulb,
  Loader2,
  Save,
  Target,
  User as UserIcon,
  Users,
  Zap,
} from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { updateMyIdeaAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { formatFTE } from '@/lib/utils';
import type { Idea } from '@/lib/types';

const MAX = {
  nombreSolucion: 200,
  problema: 4000,
  hipotesisIA: 4000,
  indicadoresValor: 4000,
  eficienciaFTE: 150,
  riesgo: 4000,
  manejaDatosSensibles: 4000,
  distribucionValor: 4000,
} as const;

const editSchema = z.object({
  nombreSolucion: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(MAX.nombreSolucion),
  problema: z.string().trim().max(MAX.problema).optional().or(z.literal('')),
  hipotesisIA: z.string().trim().max(MAX.hipotesisIA).optional().or(z.literal('')),
  indicadoresValor: z
    .string()
    .trim()
    .max(MAX.indicadoresValor)
    .optional()
    .or(z.literal('')),
  eficienciaFTE: z
    .string()
    .trim()
    .max(MAX.eficienciaFTE, 'Máximo 150 caracteres.')
    .optional()
    .or(z.literal('')),
  riesgo: z.string().trim().max(MAX.riesgo).optional().or(z.literal('')),
  manejaDatosSensibles: z
    .string()
    .trim()
    .max(MAX.manejaDatosSensibles)
    .optional()
    .or(z.literal('')),
  distribucionValor: z
    .string()
    .trim()
    .max(MAX.distribucionValor)
    .optional()
    .or(z.literal('')),
  imageUrl: z
    .string()
    .trim()
    .max(1024)
    .refine(
      (v) => v === '' || /^https?:\/\//i.test(v),
      'La URL debe empezar con http:// o https://'
    )
    .optional()
    .or(z.literal('')),
});

type EditValues = z.infer<typeof editSchema>;

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

function isPicsumPlaceholder(url: string | undefined): boolean {
  if (!url) return false;
  return /picsum\.photos/i.test(url);
}

function hasRealPhoto(url: string | undefined): boolean {
  if (!url) return false;
  if (isPicsumPlaceholder(url)) return false;
  return /^https?:\/\//i.test(url);
}

function detectRiesgoLevel(raw?: string): 'alto' | 'medio' | 'bajo' | null {
  if (!raw) return null;
  const first = raw.trim().split(/[\s\n—-]+/)[0]?.toLowerCase() ?? '';
  if (first === 'alto') return 'alto';
  if (first === 'medio') return 'medio';
  if (first === 'bajo') return 'bajo';
  return null;
}

function pickInitial(idea: Idea): EditValues {
  return {
    nombreSolucion: idea.nombreSolucion ?? idea.name ?? '',
    problema: idea.problema ?? '',
    hipotesisIA: idea.hipotesisIA ?? '',
    indicadoresValor: idea.indicadoresValor ?? '',
    eficienciaFTE: idea.eficienciaFTE ?? '',
    riesgo: idea.riesgo ?? '',
    manejaDatosSensibles: idea.manejaDatosSensibles ?? '',
    distribucionValor: idea.distribucionValor ?? '',
    imageUrl: isPicsumPlaceholder(idea.imageUrl) ? '' : idea.imageUrl ?? '',
  };
}

type Props = { idea: Idea };

export function MyIdeaEditor({ idea }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: pickInitial(idea),
    mode: 'onChange',
  });

  const values = form.watch();

  const onSubmit = (data: EditValues) => {
    startTransition(async () => {
      const res = await updateMyIdeaAction(data);
      if (res.success) {
        toast({ title: 'Listo', description: res.message });
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: res.message,
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>Así lo verán los jurados el día de la evaluación.</strong>{' '}
              Sé conciso y estratégico: prioriza claridad sobre extensión. Los
              contadores te ayudan a medir el largo. Los cambios se guardan al
              presionar “Guardar cambios”.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-base">
                  Identidad
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5">
                <TextField
                  form={form}
                  name="nombreSolucion"
                  label="Nombre de la solución *"
                  placeholder="Ej: CopilotIA para agentes de contact center"
                  max={MAX.nombreSolucion}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de la foto del equipo</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Sube la foto a Drive público, Imgur o Cloudinary y pega
                        la URL directa (idealmente 16:9).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-base">
                  Descripción
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5">
                <TextareaField
                  form={form}
                  name="problema"
                  label="Problema"
                  hint="¿Qué duele hoy? A quién, cuánto, con qué evidencia."
                  max={MAX.problema}
                  minH="min-h-28"
                />
                <TextareaField
                  form={form}
                  name="hipotesisIA"
                  label="Hipótesis de IA"
                  hint="Qué solución con IA proponen y por qué es viable."
                  max={MAX.hipotesisIA}
                  minH="min-h-28"
                />
                <TextareaField
                  form={form}
                  name="indicadoresValor"
                  label="Indicadores de valor"
                  hint="Métricas concretas que van a mover (con línea base si la tienen)."
                  max={MAX.indicadoresValor}
                  minH="min-h-24"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-base">
                  Impacto y eficiencia
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5">
                <TextareaField
                  form={form}
                  name="eficienciaFTE"
                  label="Impacto en eficiencia"
                  hint="Texto libre, máximo 150 caracteres. Preferiblemente muestra el ahorro mensual y el impacto, de forma puntual (ej: “480 horas mensuales ahorradas en el área”)."
                  max={MAX.eficienciaFTE}
                  minH="min-h-20"
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
                            <span className="italic">“{field.value}”</span>.
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
                            <span className="italic">“{field.value}”</span>.
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <TextareaField
                  form={form}
                  name="distribucionValor"
                  label="Distribución del valor"
                  hint="¿Cómo se reparte el valor entre áreas o beneficiarios?"
                  max={MAX.distribucionValor}
                  minH="min-h-24"
                  className="sm:col-span-2"
                />
              </CardContent>
            </Card>

            <div className="flex flex-wrap justify-end gap-2 pb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset(pickInitial(idea))}
                disabled={isPending}
              >
                Descartar cambios
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
          </div>

          <div className="lg:sticky lg:top-20 lg:h-fit">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Vista previa del jurado (en vivo)
            </div>
            <JurorPreview idea={idea} values={values} />
          </div>
        </div>
      </form>
    </Form>
  );
}

function TextField({
  form,
  name,
  label,
  placeholder,
  max,
}: {
  form: any;
  name: keyof EditValues;
  label: string;
  placeholder?: string;
  max: number;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-baseline justify-between gap-2">
            <FormLabel>{label}</FormLabel>
            <CharCount value={field.value} max={max} />
          </div>
          <FormControl>
            <Input placeholder={placeholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function TextareaField({
  form,
  name,
  label,
  hint,
  max,
  minH,
  className,
}: {
  form: any;
  name: keyof EditValues;
  label: string;
  hint?: string;
  max: number;
  minH?: string;
  className?: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <div className="flex items-baseline justify-between gap-2">
            <FormLabel>{label}</FormLabel>
            <CharCount value={field.value} max={max} />
          </div>
          <FormControl>
            <Textarea className={minH ?? 'min-h-20'} {...field} />
          </FormControl>
          {hint && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function CharCount({ value, max }: { value: string | undefined; max: number }) {
  const len = (value ?? '').length;
  const pct = len / max;
  const color =
    pct > 0.95
      ? 'text-rose-600'
      : pct > 0.75
      ? 'text-amber-600'
      : 'text-muted-foreground';
  return (
    <span className={`text-[10px] font-mono ${color}`}>
      {len}/{max}
    </span>
  );
}

function PreviewSection({
  title,
  icon: Icon,
  content,
  accent,
}: {
  title: string;
  icon: any;
  content?: string;
  accent?: string;
}) {
  if (!content) return null;
  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            accent ?? 'bg-muted text-foreground'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="font-headline text-sm font-semibold">{title}</h3>
      </div>
      <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/90">
        {content}
      </p>
    </section>
  );
}

function JurorPreview({
  idea,
  values,
}: {
  idea: Idea;
  values: EditValues;
}) {
  const title = values.nombreSolucion || idea.name;
  const teamPhoto = hasRealPhoto(values.imageUrl) ? values.imageUrl : null;
  const riesgoLevel = detectRiesgoLevel(values.riesgo);
  const riesgoLabel = riesgoLevel
    ? riesgoLevel.charAt(0).toUpperCase() + riesgoLevel.slice(1)
    : null;
  const fte = formatFTE(values.eficienciaFTE);

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-sky-100 via-violet-50 to-rose-50">
        {teamPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={teamPhoto}
            alt={`Equipo de ${title}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-foreground/40">
            <Users className="h-10 w-10" />
            <p className="text-[10px] font-bold uppercase tracking-widest">
              Foto del equipo
            </p>
            <p className="text-[10px] italic">pendiente</p>
          </div>
        )}
      </div>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {idea.codigo && (
                <Badge variant="outline" className="font-mono text-xs">
                  #{idea.codigo}
                </Badge>
              )}
              {riesgoLabel && (
                <Badge
                  variant="outline"
                  className={
                    riesgoLevel === 'alto'
                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : riesgoLevel === 'medio'
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  }
                >
                  Riesgo: {riesgoLabel}
                </Badge>
              )}
            </div>
            <CardTitle className="font-headline text-xl leading-tight sm:text-2xl">
              {title}
            </CardTitle>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          {idea.postulante && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground">
                {idea.postulante}
              </span>
            </div>
          )}
          {idea.area && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span>{idea.area}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fte && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Impacto en eficiencia
              </p>
            </div>
            <p className="mt-1 text-sm font-semibold leading-snug">{fte}</p>
          </div>
        )}
        <PreviewSection
          title="Problema"
          icon={AlertCircle}
          content={values.problema}
          accent="bg-rose-100 text-rose-700"
        />
        <PreviewSection
          title="Hipótesis de IA"
          icon={Lightbulb}
          content={values.hipotesisIA}
          accent="bg-violet-100 text-violet-700"
        />
        <PreviewSection
          title="Indicadores de valor"
          icon={Target}
          content={values.indicadoresValor}
          accent="bg-emerald-100 text-emerald-700"
        />
      </CardContent>
    </Card>
  );
}
