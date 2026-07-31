'use client';

// Tabla "Mis Calificaciones" del jurado en modo Evaluación Final.
// Las iniciativas se muestran divididas por categoría porque se premia
// 1 ganador por categoría.

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CategoryGroupHeader } from '@/components/ideas/category-group-header';
import { Pencil, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category, IdeaWithJurorFinalRating } from '@/lib/types';
import { groupByCategory } from '@/lib/category-groups';
import { finalRawScore, type FinalCriterion } from '@/lib/final-criteria';

function Stars({ value }: { value: number | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5" title={`${value} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            'h-3.5 w-3.5',
            i < value
              ? 'fill-amber-400 text-amber-400'
              : 'fill-transparent text-muted-foreground/30'
          )}
        />
      ))}
    </span>
  );
}

export function FinalResultsTable({
  results,
  criteria,
  categories,
}: {
  results: IdeaWithJurorFinalRating[];
  criteria: FinalCriterion[];
  categories: Category[];
}) {
  const ratedIdeas = results.filter((idea) => idea.jurorFinalRating);
  ratedIdeas.sort(
    (a, b) =>
      finalRawScore(b.jurorFinalRating!) - finalRawScore(a.jurorFinalRating!)
  );

  const notRatedIdeas = results.filter(
    (idea) => !idea.jurorFinalRating && idea.active !== false
  );

  const ratedGroups = groupByCategory(ratedIdeas, categories);
  const pendingGroups = groupByCategory(notRatedIdeas, categories);

  const renderRatedTable = (ideas: IdeaWithJurorFinalRating[]) => (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 w-[260px] bg-background">
              Iniciativa
            </TableHead>
            {criteria.map((c) => (
              <TableHead key={c.key} className="text-center text-xs">
                {c.label}
              </TableHead>
            ))}
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Observaciones</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ideas.map((idea) => (
            <TableRow key={idea.id}>
              <TableCell className="sticky left-0 bg-inherit">
                <div className="font-medium">
                  {idea.nombreSolucion ?? idea.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {idea.group}
                </div>
              </TableCell>
              {criteria.map((c) => (
                <TableCell key={c.key} className="text-center">
                  <Stars value={idea.jurorFinalRating?.scores?.[c.key]} />
                </TableCell>
              ))}
              <TableCell className="text-right text-lg font-bold text-primary">
                {finalRawScore(idea.jurorFinalRating!)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  /{criteria.length * 5}
                </span>
              </TableCell>
              <TableCell className="max-w-xs truncate text-xs">
                {idea.jurorFinalRating?.observations}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/ideas/${idea.id}`}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Editar
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Estas son las iniciativas que has calificado en la evaluación final,
        divididas por categoría y ordenadas por total de estrellas.
      </p>

      {ratedIdeas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
          <p className="text-lg font-semibold text-muted-foreground">
            Aún no has calificado ninguna iniciativa
          </p>
          <p className="text-sm text-muted-foreground/80">
            Tus calificaciones aparecerán aquí una vez que hayas evaluado las
            iniciativas finalistas.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {ratedGroups.map((group) => (
            <section key={group.key}>
              <CategoryGroupHeader
                title={group.title}
                description={group.description}
                count={group.items.length}
                countLabel="calificada"
              />
              {renderRatedTable(group.items)}
            </section>
          ))}
        </div>
      )}

      {notRatedIdeas.length > 0 && (
        <div>
          <h2 className="mb-4 font-headline text-2xl font-bold tracking-tight">
            Iniciativas pendientes de calificar
          </h2>
          <div className="space-y-8">
            {pendingGroups.map((group) => (
              <section key={group.key}>
                <CategoryGroupHeader
                  title={group.title}
                  description={group.description}
                  count={group.items.length}
                  countLabel="pendiente"
                />
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Iniciativa</TableHead>
                        <TableHead>Grupo</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((idea) => (
                        <TableRow key={idea.id}>
                          <TableCell>{idea.nombreSolucion ?? idea.name}</TableCell>
                          <TableCell>{idea.group}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" asChild>
                              <Link href={`/ideas/${idea.id}`}>Calificar</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
