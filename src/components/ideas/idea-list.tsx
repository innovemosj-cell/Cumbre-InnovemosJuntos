'use client';

import { useState } from 'react';
import type { AppMode, Category, Idea, UserRole } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { IdeaCard } from './idea-card';
import { Layers, Search } from 'lucide-react';

type IdeaListProps = {
  ideas: Idea[];
  jurorId: string;
  userRole: UserRole;
  appMode?: AppMode;
  // Si se pasan categorías, las iniciativas se muestran agrupadas por
  // categoría con su título y descripción. Sin categorías, lista plana.
  categories?: Category[];
};

export function IdeaList({
  ideas,
  jurorId,
  userRole,
  appMode = 'preseleccion',
  categories,
}: IdeaListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Número de cada iniciativa según su posición en la lista completa: se
  // calcula ANTES de filtrar para que no cambie al buscar.
  const numberById = new Map(ideas.map((idea, i) => [idea.id, i + 1]));

  const filteredIdeas = ideas.filter((idea) => {
    const q = searchTerm.toLowerCase();
    return (
      (idea.nombreSolucion ?? idea.name).toLowerCase().includes(q) ||
      (idea.postulante ?? '').toLowerCase().includes(q) ||
      idea.area.toLowerCase().includes(q) ||
      idea.group.toLowerCase().includes(q)
    );
  });

  const renderGrid = (list: Idea[]) => (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {list.map((idea) => (
        <IdeaCard
          key={idea.id}
          idea={idea}
          number={numberById.get(idea.id)}
          hasRated={Object.keys(
            (appMode === 'final' ? idea.finalRatings : idea.ratings) ?? {}
          ).includes(jurorId)}
          showStatusIndicator={userRole === 'Jurado'}
        />
      ))}
    </div>
  );

  // Agrupa las iniciativas filtradas por categoría, respetando el orden de
  // las categorías. Las que no tienen categoría van en un grupo al final.
  const groups =
    categories && categories.length > 0
      ? (() => {
          const byCategory = categories
            .map((category) => ({
              key: category.id,
              title: category.title,
              description: category.description,
              ideas: filteredIdeas.filter((i) => i.categoryId === category.id),
            }))
            .filter((g) => g.ideas.length > 0);
          const categoryIds = new Set(categories.map((c) => c.id));
          const uncategorized = filteredIdeas.filter(
            (i) => !i.categoryId || !categoryIds.has(i.categoryId)
          );
          if (uncategorized.length > 0) {
            byCategory.push({
              key: 'sin-categoria',
              title: 'Sin categoría',
              description: '',
              ideas: uncategorized,
            });
          }
          return byCategory;
        })()
      : null;

  return (
    <div>
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nombre o grupo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      {filteredIdeas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
            <p className="text-lg font-semibold text-muted-foreground">No se encontraron ideas</p>
            <p className="text-sm text-muted-foreground/80">Intenta con otro término de búsqueda.</p>
        </div>
      ) : groups ? (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-4 flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                  <Layers className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="font-headline text-xl font-semibold">
                      {group.title}
                    </h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {group.ideas.length}{' '}
                      {group.ideas.length === 1 ? 'iniciativa' : 'iniciativas'}
                    </span>
                  </div>
                  {group.description && (
                    <p className="text-sm text-muted-foreground">
                      {group.description}
                    </p>
                  )}
                </div>
              </div>
              {renderGrid(group.ideas)}
            </section>
          ))}
        </div>
      ) : (
        renderGrid(filteredIdeas)
      )}
    </div>
  );
}
