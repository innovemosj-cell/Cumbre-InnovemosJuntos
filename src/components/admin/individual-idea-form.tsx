'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardFooter,
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
import { addIndividualIdea } from '@/lib/actions';
import type { Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle } from 'lucide-react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

const ideaFormSchema = z.object({
  nombreSolucion: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  postulante: z.string().optional().or(z.literal('')),
  categoryId: z.string().optional().or(z.literal('')),
  group: z.string().min(2, 'El grupo es obligatorio.'),
  area: z.string().min(2, 'El área es obligatoria.'),
  problema: z.string().min(20, 'El problema debe tener al menos 20 caracteres.'),
  hipotesisIA: z.string().optional().or(z.literal('')),
  indicadoresValor: z.string().optional().or(z.literal('')),
  eficienciaFTE: z
    .string()
    .max(150, 'Máximo 150 caracteres.')
    .optional()
    .or(z.literal('')),
});

type IdeaFormValues = z.infer<typeof ideaFormSchema>;

export function IndividualIdeaForm({ categories }: { categories: Category[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<IdeaFormValues>({
    resolver: zodResolver(ideaFormSchema),
    defaultValues: {
      nombreSolucion: '',
      postulante: '',
      categoryId: '',
      group: '',
      area: '',
      problema: '',
      hipotesisIA: '',
      indicadoresValor: '',
      eficienciaFTE: '',
    },
  });

  const onSubmit = (data: IdeaFormValues) => {
    startTransition(async () => {
      const result = await addIndividualIdea(data);
      if (result.success) {
        toast({ title: 'Éxito', description: result.message });
        form.reset();
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl">Nueva iniciativa</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nombreSolucion"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nombre de la solución *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Asistente Omnicanal del Asesor" {...field} />
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
                    <Input placeholder="Nombre del postulante" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona la categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.title}
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
              name="eficienciaFTE"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Impacto en eficiencia</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: 480 horas mensuales ahorradas en el área"
                      maxLength={150}
                      {...field}
                    />
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
                  <FormLabel>Equipo general *</FormLabel>
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
                  <FormLabel>Área *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: ASESORÍA PROPUESTA DE VALOR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="problema"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Problema *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe el problema que la iniciativa busca resolver..."
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hipotesisIA"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Hipótesis de IA</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="¿Cómo la IA aborda el problema?"
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="indicadoresValor"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Indicadores de valor</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Eficiencias operacionales, mitigación de riesgos, etc."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" /> Crear iniciativa
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
