import { FinalResultsTable } from '@/components/juror/final-results-table';
import { ResultsTable } from '@/components/juror/results-table';
import {
  getAppMode,
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
    const [results, finalCriteria] = await Promise.all([
      getFinalRatedIdeasForJuror(user.id),
      getFinalCriteria(),
    ]);
    return (
      <div className="container mx-auto space-y-8">
        <div className="mb-8">
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Mis Calificaciones
          </h1>
          <p className="text-muted-foreground">
            Aquí se muestran tus calificaciones de la evaluación final.
          </p>
        </div>
        <FinalResultsTable results={results} criteria={finalCriteria} />
      </div>
    );
  }

  const [results, allCriteria] = await Promise.all([
    getRatedIdeasForJuror(user.id),
    getCriteria(),
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
          Aquí se muestran los resultados de las iniciativas que has evaluado.
        </p>
      </div>
      <ResultsTable results={results} criteria={visibleCriteria} />
    </div>
  );
}
