import { ExportEvaluacionesButton } from '@/components/admin/export-evaluaciones-button';
import { IndividualIdeaForm } from '@/components/admin/individual-idea-form';
import { IniciativasList } from '@/components/admin/iniciativas-list';
import { ResetVotesButton } from '@/components/admin/reset-votes-button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { getCategories, getIdeas } from '@/lib/data';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export const runtime = 'edge';

export default async function AdminIniciativasPage() {
  const { user } = await getSession();

  if (!user || user.role !== 'Admin') {
    redirect('/dashboard');
  }

  const [ideas, categories] = await Promise.all([getIdeas(), getCategories()]);

  return (
    <div className="container mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Iniciativas
        </h1>
        <p className="text-muted-foreground">
          Administra el catálogo: activa, desactiva, elimina o agrega nuevas
          iniciativas.
        </p>
      </div>

      <Tabs defaultValue="listado" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="listado">Listado</TabsTrigger>
          <TabsTrigger value="crear">Crear nueva</TabsTrigger>
        </TabsList>

        <TabsContent value="listado" className="pt-4">
          <IniciativasList ideas={ideas} categories={categories} />
        </TabsContent>

        <TabsContent value="crear" className="pt-4">
          <IndividualIdeaForm categories={categories} />
        </TabsContent>
      </Tabs>

      <ExportEvaluacionesButton />

      <ResetVotesButton />
    </div>
  );
}
