import { EvaluationForm } from '@/components/ideas/evaluation-form';
import { FinalEvaluationForm } from '@/components/ideas/final-evaluation-form';
import { InfoSection } from '@/components/ideas/info-section';
import { PodcastPlayer } from '@/components/ideas/podcast-player';
import { VoterList } from '@/components/organizer/voter-list';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getAppMode,
  getCriteria,
  getFinalCriteria,
  getIdeas,
  getUsers,
  getUsersByIds,
} from '@/lib/data';
import { getSession } from '@/lib/session';
import { notFound } from 'next/navigation';
import { Zap, User as UserIcon, Building2, Users } from 'lucide-react';
import { formatFTE } from '@/lib/utils';
import { PODCASTS_ENABLED } from '@/lib/config';

function hasRealTeamPhoto(url: string | undefined): boolean {
  if (!url) return false;
  if (/picsum\.photos/i.test(url)) return false;
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

export const runtime = 'edge';

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Todo en paralelo: cada consulta a Firestore cuesta ~200 ms, así que
  // encadenarlas duplicaba el tiempo de carga de la página.
  // Se lee la lista completa (y no solo esta idea) para poder numerar la
  // iniciativa según su posición en el mismo orden del dashboard.
  const [ideas, { user }, criteria, appMode, finalCriteria] = await Promise.all([
    getIdeas(),
    getSession(),
    getCriteria(),
    getAppMode(),
    getFinalCriteria(),
    // Precalienta la memoización por petición: getUsersByIds (más abajo)
    // reutiliza esta misma lectura sin otra ida a Firestore.
    getUsers(),
  ]);

  const idea = ideas.find((i) => i.id === id);

  if (!idea || !user) {
    notFound();
  }

  const activeIdeas = ideas.filter((i) => i.active !== false);
  const ideaIndex = activeIdeas.findIndex((i) => i.id === id);
  const ideaNumber = ideaIndex >= 0 ? ideaIndex + 1 : null;

  const isOrganizer = user.role === 'Organizer';
  const isJuror = user.role === 'Jurado';
  const isAdmin = user.role === 'Admin';

  // Iniciativa desactivada solo visible para Admin.
  if (idea.active === false && !isAdmin) {
    notFound();
  }
  const isFinalMode = appMode === 'final';
  const currentRatings = isFinalMode
    ? idea.finalRatings ?? {}
    : idea.ratings ?? {};
  const hasRated = Object.keys(currentRatings).includes(user.id);
  const jurorIds = Object.keys(currentRatings);
  const voters = await getUsersByIds(jurorIds);

  const title = idea.nombreSolucion || idea.name;
  const teamPhoto = hasRealTeamPhoto(idea.imageUrl) ? idea.imageUrl : null;
  const riesgoLevel = detectRiesgoLevel(idea.riesgo);
  const riesgoLabel = riesgoLevel
    ? riesgoLevel.charAt(0).toUpperCase() + riesgoLevel.slice(1)
    : null;

  return (
    <div className="container mx-auto max-w-4xl py-6">
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-sky-100 via-violet-50 to-rose-50 sm:aspect-[21/9]">
            {teamPhoto ? (
              <img
                src={teamPhoto}
                alt={`Equipo de ${title}`}
                loading="lazy"
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-foreground/40">
                <Users className="h-12 w-12" />
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
                  {ideaNumber != null && (
                    <Badge variant="outline" className="text-xs font-semibold">
                      Iniciativa {ideaNumber} de {activeIdeas.length}
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
                <CardTitle className="font-headline text-2xl leading-tight sm:text-3xl">
                  {title}
                </CardTitle>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {idea.postulante && (
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-foreground">
                    {idea.postulante}
                  </span>
                </div>
              )}
              {idea.area && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>{idea.area}</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {PODCASTS_ENABLED && <PodcastPlayer idea={idea} />}

            {formatFTE(idea.eficienciaFTE) && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">
                    Impacto en eficiencia
                  </p>
                </div>
                <p className="mt-2 text-base font-semibold leading-snug">
                  {formatFTE(idea.eficienciaFTE)}
                </p>
              </div>
            )}

            <InfoSection
              title="Problema"
              icon="alert"
              content={idea.problema}
              accent="bg-rose-100 text-rose-700"
            />

            <InfoSection
              title="Hipótesis de IA"
              icon="lightbulb"
              content={idea.hipotesisIA}
              accent="bg-violet-100 text-violet-700"
            />

            <InfoSection
              title="Indicadores de valor"
              icon="target"
              content={idea.indicadoresValor}
              accent="bg-emerald-100 text-emerald-700"
            />

            {isOrganizer && (
              <>
                <InfoSection
                  title="Puntos fuertes"
                  icon="target"
                  content={idea.puntosFuertes}
                  accent="bg-sky-100 text-sky-700"
                />
                <InfoSection
                  title="Aspectos a mejorar"
                  icon="alert"
                  content={idea.aspectosAMejorar}
                  accent="bg-amber-100 text-amber-700"
                />
                {idea.tecnologiasRecomendadas && (
                  <InfoSection
                    title="Tecnologías recomendadas"
                    icon="zap"
                    content={idea.tecnologiasRecomendadas}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {isJuror &&
          (isFinalMode ? (
            <FinalEvaluationForm
              idea={idea}
              jurorId={user.id}
              criteria={finalCriteria}
              hasRated={hasRated}
            />
          ) : (
            <EvaluationForm
              idea={idea}
              jurorId={user.id}
              jurorFrentes={user.frentesAEvaluar ?? []}
              criteria={criteria}
              hasRated={hasRated}
            />
          ))}
        {(isOrganizer || isJuror) && (
          <VoterList
            voters={voters}
            refresh={
              isOrganizer
                ? {
                    ideaId: idea.id,
                    mode: isFinalMode ? 'final' : 'preselection',
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
