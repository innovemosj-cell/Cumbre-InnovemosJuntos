'use client';

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
import { Pencil } from 'lucide-react';
import type { Category, Criterion, IdeaWithJurorRating, Rating } from '@/lib/types';
import { groupByCategory } from '@/lib/category-groups';

type ResultsTableProps = {
  results: IdeaWithJurorRating[];
  criteria: Criterion[];
  categories: Category[];
};

const sumRatingScores = (rating: Rating | undefined) => {
  if (!rating?.scores) return 0;
  return Object.values(rating.scores).reduce((acc, n) => acc + (n || 0), 0);
};

export function ResultsTable({ results, criteria, categories }: ResultsTableProps) {
  const ratedIdeas = results.filter((idea) => idea.jurorRating);
  ratedIdeas.sort(
    (a, b) => sumRatingScores(b.jurorRating) - sumRatingScores(a.jurorRating)
  );

  const notRatedIdeas = results.filter(
    (idea) => !idea.jurorRating && idea.active !== false
  );

  // Las calificaciones y las pendientes se muestran divididas por categoría.
  const ratedGroups = groupByCategory(ratedIdeas, categories);
  const pendingGroups = groupByCategory(notRatedIdeas, categories);

  const renderRatedTable = (ideas: IdeaWithJurorRating[]) => (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 w-[260px] bg-background">
              Iniciativa
            </TableHead>
            {criteria.map((c) => (
              <TableHead key={c.id} className="text-center text-xs">
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
                <TableCell key={c.id} className="text-center">
                  {idea.jurorRating?.scores?.[c.id] ?? '—'}
                </TableCell>
              ))}
              <TableCell className="text-right text-lg font-bold text-primary">
                {sumRatingScores(idea.jurorRating)}
              </TableCell>
              <TableCell className="max-w-xs truncate text-xs">
                {idea.jurorRating?.observations}
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
        Estas son las iniciativas que has evaluado, divididas por categoría y
        ordenadas por puntaje bruto.
      </p>

      {ratedIdeas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
          <p className="text-lg font-semibold text-muted-foreground">
            Aún no has calificado ninguna iniciativa
          </p>
          <p className="text-sm text-muted-foreground/80">
            Tus calificaciones aparecerán aquí una vez que hayas evaluado las
            iniciativas.
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
