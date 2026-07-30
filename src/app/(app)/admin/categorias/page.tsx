import { CategoriesEditor } from '@/components/admin/categories-editor';
import { getCategories } from '@/lib/data';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export const runtime = 'edge';

export default async function AdminCategoriasPage() {
  const { user } = await getSession();

  if (!user || user.role !== 'Admin') {
    redirect('/dashboard');
  }

  const categories = await getCategories();

  return (
    <div className="container mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Categorías
        </h1>
        <p className="text-muted-foreground">
          Las iniciativas compiten dentro de una categoría y en la evaluación
          final se premia 1 ganador por cada una.
        </p>
      </div>
      <CategoriesEditor initial={categories} />
    </div>
  );
}
