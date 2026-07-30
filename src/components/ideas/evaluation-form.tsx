'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import type { Criterion, FrenteKey, Idea } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Check, ChevronDown, Info, Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const FRENTE_META: Record<FrenteKey, { label: string; ring: string; chip: string; bar: string }> = {
  estrategia: {
    label: 'Estrategia',
    ring: 'ring-sky-500',
    chip: 'bg-sky-100 text-sky-800 border-sky-200',
    bar: 'bg-sky-500',
  },
  impacto: {
    label: 'Impacto',
    ring: 'ring-rose-500',
    chip: 'bg-rose-100 text-rose-800 border-rose-200',
    bar: 'bg-rose-500',
  },
  innovacion: {
    label: 'Innovación',
    ring: 'ring-violet-500',
    chip: 'bg-violet-100 text-violet-800 border-violet-200',
    bar: 'bg-violet-500',
  },
  tecnico: {
    label: 'Técnico',
    ring: 'ring-emerald-500',
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bar: 'bg-emerald-500',
  },
};

function InfoPopover({
  title,
  items,
}: {
  title?: string;
  items: string[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <span
        role="button"
        tabIndex={0}
        aria-label="Más información"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }
        }}
        className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-foreground hover:text-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="h-3 w-3" />
      </span>
      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-full z-50 mt-2 w-72 rounded-md border bg-popover p-3 text-popover-foreground shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
          )}
          <ul className="space-y-1 text-sm leading-snug">
            {items.map((it, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-semibold text-foreground/70">{i + 1}.</span>
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LevelCard({
  level,
  active,
  onClick,
  frenteRing,
}: {
  level: { score: number; label: string; description: string };
  active: boolean;
  onClick: () => void;
  frenteRing: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-full flex-col rounded-lg border bg-card p-4 text-left transition-all',
        'hover:border-foreground/40 hover:shadow-sm',
        active
          ? `border-transparent ring-2 ring-offset-2 ${frenteRing} shadow-md bg-accent/50`
          : 'border-border'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold',
            active ? 'bg-foreground text-background' : 'bg-muted text-foreground'
          )}
        >
          {level.score}
        </span>
        {active && <Check className="h-5 w-5 text-foreground" aria-label="Seleccionado" />}
      </div>
      <p className="mt-3 text-sm font-semibold leading-tight">{level.label}</p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">{level.description}</p>
    </button>
  );
}

function CriterionPanel({
  criterion,
  selected,
  open,
  onOpenChange,
  onSelect,
  panelRef,
}: {
  criterion: Criterion;
  selected: number | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (score: number) => void;
  panelRef?: (el: HTMLDivElement | null) => void;
}) {
  const meta = FRENTE_META[criterion.frente];
  const selectedLevel = criterion.levels.find((l) => l.score === selected);

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div
        ref={panelRef}
        className={cn(
          'rounded-xl border bg-card overflow-hidden transition-shadow scroll-mt-24',
          open && 'shadow-sm'
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex items-stretch">
              <div className={cn('w-1.5 shrink-0', meta.bar)} />
              <div className="flex flex-1 items-center justify-between gap-3 p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
                    <span className="text-[10px] font-medium text-muted-foreground leading-none">
                      PESO
                    </span>
                    <span className="text-base font-bold leading-tight">
                      {criterion.weight}%
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <Badge variant="outline" className={cn('w-fit mb-1 text-xs font-medium', meta.chip)}>
                      {meta.label}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline text-base font-semibold sm:text-lg leading-snug">
                        {criterion.label}
                      </h3>
                      {criterion.infoHelp && (
                        <InfoPopover
                          title={criterion.infoHelp.title}
                          items={criterion.infoHelp.items}
                        />
                      )}
                    </div>
                    {selectedLevel && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Seleccionado:{' '}
                        <span className="font-medium text-foreground">
                          {selectedLevel.score} · {selectedLevel.label}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedLevel && !open && (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-700">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
                      open && 'rotate-180'
                    )}
                  />
                </div>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t bg-muted/30 px-4 py-4 sm:px-6 sm:py-5">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                ¿Qué evalúa?
              </p>
              <p className="mt-1 text-sm leading-relaxed">{criterion.description}</p>
            </div>
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(auto-fit, minmax(${
                  criterion.levels.length > 3 ? '170px' : '200px'
                }, 1fr))`,
              }}
            >
              {criterion.levels.map((level) => (
                <LevelCard
                  key={level.score}
                  level={level}
                  active={selected === level.score}
                  onClick={() => onSelect(level.score)}
                  frenteRing={meta.ring}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function EvaluationForm({
  idea,
  jurorId,
  jurorFrentes,
  criteria,
  hasRated,
}: {
  idea: Idea;
  jurorId: string;
  jurorFrentes: FrenteKey[];
  criteria: Criterion[];
  hasRated: boolean;
}) {
  const existing = idea.ratings?.[jurorId];
  const [scores, setScores] = useState<Record<string, number>>(existing?.scores ?? {});
  const [observations, setObservations] = useState(existing?.observations ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openPanelId, setOpenPanelId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const visibleCriteria = useMemo(
    () => criteria.filter((c) => jurorFrentes.includes(c.frente)),
    [criteria, jurorFrentes]
  );

  const criteriaByFrente = useMemo(() => {
    const map = new Map<FrenteKey, Criterion[]>();
    for (const c of visibleCriteria) {
      const arr = map.get(c.frente) ?? [];
      arr.push(c);
      map.set(c.frente, arr);
    }
    return map;
  }, [visibleCriteria]);

  useEffect(() => {
    if (openPanelId !== null) return;
    const first = visibleCriteria.find((c) => !(scores[c.id] > 0));
    if (first) setOpenPanelId(first.id);
  }, [visibleCriteria, scores, openPanelId]);

  const isComplete =
    visibleCriteria.length > 0 && visibleCriteria.every((c) => (scores[c.id] ?? 0) > 0);

  const completed = visibleCriteria.filter((c) => (scores[c.id] ?? 0) > 0).length;
  const total = visibleCriteria.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  function handleSelectScore(criterionId: string, score: number) {
    setScores((prev) => ({ ...prev, [criterionId]: score }));
    const idx = visibleCriteria.findIndex((c) => c.id === criterionId);
    const nextUnanswered = visibleCriteria
      .slice(idx + 1)
      .find((c) => !(scores[c.id] > 0) && c.id !== criterionId);
    if (nextUnanswered) {
      setOpenPanelId(nextUnanswered.id);
      window.setTimeout(() => {
        const el = panelRefs.current[nextUnanswered.id];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } else {
      setOpenPanelId(null);
    }
  }

  function handleSubmit() {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/ratings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ideaId: idea.id,
            jurorId,
            scores,
            evaluatedFrentes: jurorFrentes,
            observations,
          }),
        });

        let body: any = null;
        try {
          body = await res.json();
        } catch {
          // respuesta no JSON
        }

        if (!res.ok || body?.error) {
          const msg = body?.error ?? `Error ${res.status}.`;
          setErrorMsg(msg);
          toast({
            variant: 'destructive',
            title: 'Error al enviar',
            description: msg,
          });
          return;
        }

        setConfirmOpen(false);
        toast({
          title: hasRated ? 'Calificación actualizada' : 'Calificación enviada',
          description: 'Gracias por tu evaluación.',
        });
        router.push('/dashboard');
        router.refresh();
      } catch (e: any) {
        console.error('submit error:', {
          name: e?.name,
          message: e?.message,
        });
        setErrorMsg('No se pudo enviar la calificación. Intenta de nuevo.');
      }
    });
  }

  return (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="font-headline text-xl">
                {hasRated ? 'Actualizar Evaluación' : 'Evaluar Iniciativa'}
              </CardTitle>
              <CardDescription>
                Tu perfil te asigna evaluar:{' '}
                {jurorFrentes.map((f, i) => (
                  <span key={f}>
                    <span className="font-medium text-foreground">
                      {FRENTE_META[f].label}
                    </span>
                    {i < jurorFrentes.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </CardDescription>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-right">
              <p className="text-xs text-muted-foreground">Progreso</p>
              <p className="font-headline text-lg font-semibold">
                {completed}/{total}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({progress}%)
                </span>
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {[...criteriaByFrente.entries()].map(([frente, items]) => (
            <section key={frente} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', FRENTE_META[frente].bar)} />
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Frente {FRENTE_META[frente].label}
                </h2>
                <span className="text-xs text-muted-foreground">
                  ({items.length} {items.length === 1 ? 'criterio' : 'criterios'})
                </span>
              </div>
              <div className="space-y-3">
                {items.map((c) => (
                  <CriterionPanel
                    key={c.id}
                    criterion={c}
                    selected={scores[c.id]}
                    open={openPanelId === c.id}
                    onOpenChange={(o) => setOpenPanelId(o ? c.id : null)}
                    onSelect={(score) => handleSelectScore(c.id, score)}
                    panelRef={(el) => {
                      panelRefs.current[c.id] = el;
                    }}
                  />
                ))}
              </div>
            </section>
          ))}

          <div className="space-y-2 pt-2">
            <label htmlFor="observations" className="text-sm font-medium leading-none">
              Observaciones (opcional)
            </label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Comparte cualquier comentario adicional sobre la iniciativa..."
              maxLength={500}
              className="min-h-[100px]"
            />
            <p className="text-right text-xs text-muted-foreground">
              {observations.length}/500
            </p>
          </div>

          {errorMsg && (
            <Alert variant="destructive">
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <AlertDialogTrigger asChild>
            <Button type="button" className="w-full" disabled={!isComplete || isPending}>
              {hasRated ? 'Revisar y Actualizar' : 'Revisar y Enviar'}
            </Button>
          </AlertDialogTrigger>
        </CardFooter>
      </Card>

      <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {hasRated ? 'Confirmar Actualización' : 'Confirmar Calificación'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Revisa tu calificación antes de enviarla. Podrás modificarla más tarde si lo necesitas.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 space-y-3">
          {visibleCriteria.map((c) => {
            const selected = scores[c.id];
            const level = c.levels.find((l) => l.score === selected);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <span className="flex-1 font-medium leading-tight">{c.label}</span>
                <Badge variant="secondary">
                  {selected} · {level?.label}
                </Badge>
              </div>
            );
          })}
          {observations && (
            <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Observaciones
              </p>
              <p className="text-sm italic">{observations}</p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />{' '}
                {hasRated ? 'Actualizar Calificación' : 'Enviar Calificación'}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
