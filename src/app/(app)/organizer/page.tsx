import { ExportEvaluacionesButton } from '@/components/admin/export-evaluaciones-button';
import { DetailedResults } from '@/components/organizer/detailed-results';
import { FinalResultsLive } from '@/components/organizer/final-results-live';
import { PriorityMatrix } from '@/components/organizer/priority-matrix';
import { ResultsDashboard } from '@/components/organizer/results-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getAppMode,
  getFinalCriteria,
  getIdeasWithFinalResults,
  getIdeasWithResults,
  getUsers,
} from '@/lib/data';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export const runtime = 'edge';

export default async function OrganizerPage() {
  const { user } = await getSession();

  if (!user || user.role !== 'Organizer') {
    redirect('/dashboard');
  }

  const appMode = await getAppMode();

  if (appMode === 'final') {
    const [finalResults, finalCriteria, users] = await Promise.all([
      getIdeasWithFinalResults(),
      getFinalCriteria(),
      getUsers(),
    ]);
    const activeJurors = users.filter(
      (u) => u.role === 'Jurado' && u.active !== false
    );
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">
              Resultados — Evaluación Final
            </h1>
            <p className="text-muted-foreground">
              Ranking de las iniciativas finalistas según las estrellas de los
              jurados. Los resultados de la preselección siguen guardados y
              vuelven a mostrarse si el admin cambia el modo.
            </p>
          </div>
          <ExportEvaluacionesButton variant="inline" />
        </div>
        <FinalResultsLive
          initialResults={finalResults}
          criteria={finalCriteria}
          jurors={activeJurors}
        />
      </div>
    );
  }

  const results = await getIdeasWithResults();

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Resultados de Calificación
          </h1>
          <p className="text-muted-foreground">
            Top de iniciativas evaluadas y vista de priorización.
          </p>
        </div>
        <ExportEvaluacionesButton variant="inline" />
      </div>

      <Tabs defaultValue="resultados" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
          <TabsTrigger value="matriz">Matriz de Priorización</TabsTrigger>
        </TabsList>

        <TabsContent value="resultados" className="space-y-6 pt-4">
          <DetailedResults />
          <ResultsDashboard results={results} />
        </TabsContent>

        <TabsContent value="matriz" className="space-y-4 pt-4">
          <div>
            <h2 className="font-headline text-xl font-semibold">
              Matriz de Priorización
            </h2>
            <p className="text-sm text-muted-foreground">
              Cada iniciativa se posiciona según su Impacto Estratégico (eje Y)
              y la Facilidad de Implementación (eje X). Los cuadrantes te ayudan
              a clasificar dónde invertir esfuerzo.
            </p>
          </div>
          <PriorityMatrix results={results} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
