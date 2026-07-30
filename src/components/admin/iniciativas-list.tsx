'use client';

import { useState, useTransition } from 'react';
import type { Category, Idea } from '@/lib/types';
import {
  deleteIdeaAction,
  reorderIdeasAction,
  toggleIdeaActiveAction,
} from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Search,
  Trash2,
  ExternalLink,
  GripVertical,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { RegeneratePodcastButton } from './regenerate-podcast-button';
import { PODCASTS_ENABLED } from '@/lib/config';
import { TeamPhotoEditor } from './team-photo-editor';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Props = {
  ideas: Idea[];
  categories: Category[];
};

export function IniciativasList({ ideas: initialIdeas, categories }: Props) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const [ideas, setIdeas] = useState(initialIdeas);
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [, startReorderTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filtered = ideas.filter((i) => {
    const q = search.toLowerCase();
    return (
      (i.nombreSolucion ?? i.name).toLowerCase().includes(q) ||
      (i.postulante ?? '').toLowerCase().includes(q) ||
      i.area.toLowerCase().includes(q) ||
      i.group.toLowerCase().includes(q) ||
      i.codigo.toLowerCase().includes(q)
    );
  });

  const dragDisabled = search.trim().length > 0;

  function handleToggle(idea: Idea, next: boolean) {
    setPendingId(idea.id);
    setIdeas((prev) =>
      prev.map((i) => (i.id === idea.id ? { ...i, active: next } : i))
    );
    startTransition(async () => {
      const res = await toggleIdeaActiveAction(idea.id, next);
      setPendingId(null);
      if (!res.success) {
        setIdeas((prev) =>
          prev.map((i) => (i.id === idea.id ? { ...i, active: !next } : i))
        );
        toast({
          variant: 'destructive',
          title: 'Error',
          description: res.message,
        });
      } else {
        toast({ title: next ? 'Activada' : 'Desactivada', description: res.message });
        router.refresh();
      }
    });
  }

  function handlePodcastSuccess(ideaId: string, audioUrl: string) {
    setIdeas((prev) =>
      prev.map((i) => (i.id === ideaId ? { ...i, audioUrl } : i))
    );
  }

  function handleDelete(idea: Idea) {
    setPendingId(idea.id);
    startTransition(async () => {
      const res = await deleteIdeaAction(idea.id);
      setPendingId(null);
      if (res.success) {
        setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
        toast({ title: 'Eliminada', description: res.message });
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: res.message,
        });
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ideas.findIndex((i) => i.id === active.id);
    const newIndex = ideas.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(ideas, oldIndex, newIndex).map((i, idx) => ({
      ...i,
      order: idx,
    }));
    const previous = ideas;
    setIdeas(next);

    startReorderTransition(async () => {
      const res = await reorderIdeasAction({ ids: next.map((i) => i.id) });
      if (!res.success) {
        setIdeas(previous);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: res.message,
        });
      } else {
        toast({ title: 'Orden actualizado', description: res.message });
        router.refresh();
      }
    });
  }

  const activeCount = ideas.filter((i) => i.active !== false).length;
  const inactiveCount = ideas.length - activeCount;

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
              {activeCount} activas
            </Badge>
            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
              {inactiveCount} inactivas
            </Badge>
            <Badge variant="outline" className="font-mono">
              Total {ideas.length}
            </Badge>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {dragDisabled
            ? 'Para reordenar arrastrando, limpia el buscador.'
            : 'Arrastra cada iniciativa por el ícono ⠿ para definir el orden en que los jurados las verán.'}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={ideas.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {filtered.map((idea) => {
                const isActive = idea.active !== false;
                const rowPending = isPending && pendingId === idea.id;
                return (
                  <SortableIdeaRow
                    key={idea.id}
                    idea={idea}
                    categoryTitle={
                      idea.categoryId
                        ? categoryById.get(idea.categoryId)?.title
                        : undefined
                    }
                    isActive={isActive}
                    rowPending={rowPending}
                    dragDisabled={dragDisabled}
                    onToggle={(v) => handleToggle(idea, v)}
                    onDelete={() => handleDelete(idea)}
                    onPhotoSaved={(newUrl) =>
                      setIdeas((prev) =>
                        prev.map((i) =>
                          i.id === idea.id ? { ...i, imageUrl: newUrl } : i
                        )
                      )
                    }
                    onPodcastSuccess={(audioUrl) =>
                      handlePodcastSuccess(idea.id, audioUrl)
                    }
                  />
                );
              })}
              {filtered.length === 0 && (
                <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                  No hay iniciativas que coincidan con el filtro.
                </p>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}

type SortableIdeaRowProps = {
  idea: Idea;
  categoryTitle?: string;
  isActive: boolean;
  rowPending: boolean;
  dragDisabled: boolean;
  onToggle: (v: boolean) => void;
  onDelete: () => void;
  onPhotoSaved: (newUrl: string) => void;
  onPodcastSuccess: (audioUrl: string) => void;
};

function SortableIdeaRow({
  idea,
  categoryTitle,
  isActive,
  rowPending,
  dragDisabled,
  onToggle,
  onDelete,
  onPhotoSaved,
  onPodcastSuccess,
}: SortableIdeaRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea.id, disabled: dragDisabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 transition-colors',
        !isActive && 'bg-muted/40 opacity-75',
        isDragging && 'shadow-lg ring-2 ring-primary/40'
      )}
    >
      <button
        type="button"
        aria-label="Arrastrar para reordenar"
        className={cn(
          'flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted',
          dragDisabled && 'cursor-not-allowed opacity-40'
        )}
        {...attributes}
        {...listeners}
        disabled={dragDisabled}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex flex-1 min-w-[220px] items-start gap-3">
        {idea.codigo && (
          <Badge variant="outline" className="mt-0.5 font-mono text-xs">
            #{idea.codigo}
          </Badge>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium leading-tight', !isActive && 'line-through')}>
            {idea.nombreSolucion || idea.name}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {categoryTitle ? (
              <Badge
                variant="outline"
                className="border-violet-200 bg-violet-50 text-violet-700"
              >
                {categoryTitle}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-700"
              >
                Sin categoría
              </Badge>
            )}
            {idea.postulante && <span>{idea.postulante}</span>}
            {idea.area && (
              <>
                <span className="opacity-50">·</span>
                <span>{idea.area}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs font-medium',
              isActive ? 'text-emerald-700' : 'text-muted-foreground'
            )}
          >
            {isActive ? 'Activa' : 'Inactiva'}
          </span>
          <Switch
            checked={isActive}
            onCheckedChange={onToggle}
            disabled={rowPending}
          />
        </div>
        <TeamPhotoEditor
          ideaId={idea.id}
          initialImageUrl={idea.imageUrl}
          onSaved={onPhotoSaved}
        />
        {PODCASTS_ENABLED && (
          <RegeneratePodcastButton
            ideaId={idea.id}
            ideaName={idea.nombreSolucion || idea.name}
            hasAudio={!!idea.audioUrl}
            onSuccess={onPodcastSuccess}
          />
        )}
        <Button variant="ghost" size="icon" asChild title="Editar iniciativa">
          <Link href={`/admin/iniciativas/${idea.id}/edit`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild title="Ver detalle">
          <Link href={`/ideas/${idea.id}`}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              disabled={rowPending}
            >
              {rowPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar iniciativa</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción borrará la iniciativa{' '}
                <strong>{idea.nombreSolucion || idea.name}</strong> y
                todas las calificaciones asociadas.{' '}
                <span className="font-medium text-rose-700">
                  Esta acción no se puede deshacer.
                </span>
                <br />
                <br />
                Si solo quieres ocultarla a los jurados sin perder
                datos, usa el switch de “Activa/Inactiva”.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Sí, eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
