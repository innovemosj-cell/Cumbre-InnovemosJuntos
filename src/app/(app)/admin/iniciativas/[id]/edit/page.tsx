import { EditIdeaForm } from '@/components/admin/edit-idea-form';
import { getCategories, getIdeaById } from '@/lib/data';
import { getSession } from '@/lib/session';
import { notFound, redirect } from 'next/navigation';

export const runtime = 'edge';

export default async function EditIdeaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getSession();
  if (!user || user.role !== 'Admin') {
    redirect('/dashboard');
  }

  const { id } = await params;
  const [idea, categories] = await Promise.all([
    getIdeaById(id),
    getCategories(),
  ]);
  if (!idea) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-6">
      <div>
        <h1 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">
          Editar iniciativa
        </h1>
        <p className="text-muted-foreground">
          {idea.nombreSolucion || idea.name}
        </p>
      </div>
      <EditIdeaForm idea={idea} categories={categories} />
    </div>
  );
}
