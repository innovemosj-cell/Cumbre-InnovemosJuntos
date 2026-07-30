import Link from 'next/link';
import type { Idea } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  CheckCircle2,
  Circle,
  User as UserIcon,
  Users,
  Zap,
} from 'lucide-react';
import { formatFTE } from '@/lib/utils';

type IdeaCardProps = {
  idea: Idea;
  number?: number;
  hasRated: boolean;
  showStatusIndicator: boolean;
};

// Una imagen `imageUrl` puede venir del seed inicial con picsum.photos
// (placeholder aleatorio decorativo). Hasta que se cargue la foto real
// del equipo mostramos un placeholder neutro.
function hasRealTeamPhoto(url: string | undefined): boolean {
  if (!url) return false;
  if (/picsum\.photos/i.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

export function IdeaCard({ idea, number, hasRated, showStatusIndicator }: IdeaCardProps) {
  const title = idea.nombreSolucion || idea.name;
  const horas = formatFTE(idea.eficienciaFTE);
  const teamPhoto = hasRealTeamPhoto(idea.imageUrl) ? idea.imageUrl : null;

  return (
    <Link
      href={`/ideas/${idea.id}`}
      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="relative flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
        {/* Header con imagen del equipo (o placeholder) */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-sky-100 via-violet-50 to-rose-50">
          {teamPhoto ? (
            <img
              src={teamPhoto}
              alt={`Equipo de ${title}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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

          {/* Overlay badges */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            {number != null && (
              <Badge
                variant="outline"
                className="border-transparent bg-background/90 text-xs font-semibold shadow-sm backdrop-blur-sm"
              >
                Iniciativa {number}
              </Badge>
            )}
            {showStatusIndicator &&
              (hasRated ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
                  <CheckCircle2 className="h-3 w-3" /> Evaluada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
                  <Circle className="h-3 w-3" /> Pendiente
                </span>
              ))}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-headline text-lg font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-primary">
            {title}
          </h3>

          <div className="mt-3 flex-1 space-y-1.5 text-sm">
            {idea.postulante && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <UserIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="line-clamp-1">{idea.postulante}</span>
              </div>
            )}
            {idea.area && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="line-clamp-2 text-xs">{idea.area}</span>
              </div>
            )}
          </div>

          {horas && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{horas}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
