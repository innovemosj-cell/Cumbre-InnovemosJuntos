import { FinalResultsTable } from '@/components/juror/final-results-table';
import { ResultsTable } from '@/components/juror/results-table';
import {
  getAppMode,
  getCategories,
  getCriteria,
  getFinalCriteria,
  getFinalRatedIdeasForJuror,
  getRatedIdeasForJuror,
} from '@/lib/data';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export const runtime = 'edge';

export default async function MyResultsPage() {
  const { user } = await getSession();

  if (!user || user.role !== 'Jurado') {
    redirect('/dashboard');
  }

  const appMode = await getAppMode();

  if (appMode === 'final') {
    const [results, finalCriteria, categories] = await Promise.all([
      getFinalRatedIdeasForJuror(user.id),
      getFinalCriteria(),
      getCategories(),
    ]);
    return (
      <div className="container mx-auto space-y-8">
        <div className="mb-8">
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Mis Calificaciones
          </h1>
          <p className="text-muted-foreground">
            Aquí se muestran tus calificaciones de la evaluación final,
            divididas por categoría.
          </p>
        </div>
        <FinalResultsTable
          results={results}
          criteria={finalCriteria}
          categories={categories}
        />
      </div>
    );
  }

  const [results, allCriteria, categories] = await Promise.all([
    getRatedIdeasForJuror(user.id),
    getCriteria(),
    getCategories(),
  ]);
  const frentes = user.frentesAEvaluar ?? [];
  const visibleCriteria = allCriteria.filter((c) => frentes.includes(c.frente));

  return (
    <div className="container mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Mis Calificaciones
        </h1>
        <p className="text-muted-foreground">
          Aquí se muestran los resultados de las iniciativas que has evaluado,
          divididos por categoría.
        </p>
      </div>
      <ResultsTable
        results={results}
        criteria={visibleCriteria}
        categories={categories}
      />
    </div>
  );
}
