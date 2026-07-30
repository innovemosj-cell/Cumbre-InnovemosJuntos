import { IdeaList } from '@/components/ideas/idea-list';
import { getActiveIdeas, getAppMode, getCategories, getIdeas } from '@/lib/data';
import { getSession } from '@/lib/session';

export const runtime = 'edge';

export default async function DashboardPage() {
  const { user } = await getSession();

  if (!user) {
    // This should not happen due to layout protection, but as a safeguard.
    return null;
  }

  if (user.role === 'Jurado') {
    const [appMode, ideas, categories] = await Promise.all([
      getAppMode(),
      getActiveIdeas(),
      getCategories(),
    ]);
    return (
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            {appMode === 'final' ? 'Evaluación Final' : 'Ideas a Calificar'}
          </h1>
          <p className="text-muted-foreground">
            {appMode === 'final'
              ? 'Califica cada iniciativa finalista de 1 a 5 estrellas.'
              : 'Evalúa las ideas asignadas a continuación.'}
          </p>
        </div>
        <IdeaList
          ideas={ideas}
          jurorId={user.id}
          userRole={user.role}
          appMode={appMode}
          categories={categories}
        />
      </div>
    );
  }

  const [ideas, categories] = await Promise.all([getIdeas(), getCategories()]);
  const activeIdeas = ideas.filter((i) => i.active !== false);
  const inactiveIdeas = ideas.filter((i) => i.active === false);

  return (
    <div className="container mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Iniciativas
        </h1>
        <p className="text-muted-foreground">
          Visualiza el estado de las iniciativas: activas e inactivas.
        </p>
      </div>

      <section>
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="font-headline text-xl font-semibold">Activas</h2>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            {activeIdeas.length}
          </span>
        </div>
        {activeIdeas.length > 0 ? (
          <IdeaList
            ideas={activeIdeas}
            jurorId={user.id}
            userRole={user.role}
            categories={categories}
          />
        ) : (
          <p className="rounded-lg border-2 border-dashed border-muted-foreground/30 py-10 text-center text-sm text-muted-foreground">
            No hay iniciativas activas.
          </p>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="font-headline text-xl font-semibold">Inactivas</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {inactiveIdeas.length}
          </span>
        </div>
        {inactiveIdeas.length > 0 ? (
          <div className="opacity-60">
            <IdeaList
              ideas={inactiveIdeas}
              jurorId={user.id}
              userRole={user.role}
            />
          </div>
        ) : (
          <p className="rounded-lg border-2 border-dashed border-muted-foreground/30 py-10 text-center text-sm text-muted-foreground">
            No hay iniciativas inactivas.
          </p>
        )}
      </section>
    </div>
  );
}
