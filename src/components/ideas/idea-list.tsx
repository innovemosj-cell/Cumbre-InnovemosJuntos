'use client';

import { useState } from 'react';
import type { AppMode, Idea, UserRole } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { IdeaCard } from './idea-card';
import { Search } from 'lucide-react';

type IdeaListProps = {
  ideas: Idea[];
  jurorId: string;
  userRole: UserRole;
  appMode?: AppMode;
};

export function IdeaList({
  ideas,
  jurorId,
  userRole,
  appMode = 'preseleccion',
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
      {filteredIdeas.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredIdeas.map((idea) => (
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
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
            <p className="text-lg font-semibold text-muted-foreground">No se encontraron ideas</p>
            <p className="text-sm text-muted-foreground/80">Intenta con otro término de búsqueda.</p>
        </div>
      )}
    </div>
  );
}
