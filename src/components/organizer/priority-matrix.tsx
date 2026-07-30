'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { IdeaWithTotals } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Sparkles, Lightbulb, Wrench, AlertTriangle } from 'lucide-react';

type Point = {
  id: string;
  name: string;
  postulante: string;
  area: string;
  x: number;
  y: number;
  weightedTotal: number;
  quadrant: 'estrella' | 'estrategicos' | 'mejorasRapidas' | 'reconsiderar';
};

type QuadrantKey = Point['quadrant'];

const QUADRANT_META: Record<
  QuadrantKey,
  {
    label: string;
    fill: string;
    stroke: string;
    dot: string;
    text: string;
    chip: string;
    icon: any;
  }
> = {
  estrella: {
    label: 'Proyecto Estrella',
    fill: '#86efac33',
    stroke: '#16a34a',
    dot: '#16a34a',
    text: 'text-emerald-700',
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: Sparkles,
  },
  estrategicos: {
    label: 'Proyectos Estratégicos',
    fill: '#fcd34d33',
    stroke: '#d97706',
    dot: '#d97706',
    text: 'text-amber-700',
    chip: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Lightbulb,
  },
  mejorasRapidas: {
    label: 'Mejoras Rápidas',
    fill: '#93c5fd33',
    stroke: '#2563eb',
    dot: '#2563eb',
    text: 'text-blue-700',
    chip: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Wrench,
  },
  reconsiderar: {
    label: 'Reconsiderar',
    fill: '#fda4af33',
    stroke: '#e11d48',
    dot: '#e11d48',
    text: 'text-rose-700',
    chip: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: AlertTriangle,
  },
};

const QUADRANT_ORDER: QuadrantKey[] = [
  'estrella',
  'estrategicos',
  'mejorasRapidas',
  'reconsiderar',
];

function computeAxes(idea: IdeaWithTotals): { x: number; y: number } {
  const { porFrente } = idea.totalScores;
  // Eje Y (Impacto Estratégico, Grupo 1 — 60% peso global):
  // Estrategia (30) + Impacto (25) + Innovación (15) → suman 70 sobre 100,
  // se normalizan al ponderar dentro del grupo.
  const yNum =
    porFrente.estrategia.raw * 30 +
    porFrente.impacto.raw * 25 +
    porFrente.innovacion.raw * 15;
  const yDen = 30 + 25 + 15;
  const y = yDen ? yNum / yDen : 0;
  // Eje X (Facilidad de Implementación, Grupo 2 — 40% peso global):
  // Único frente Técnico (datos + factibilidad + tiempo).
  const x = porFrente.tecnico.raw;
  return { x, y };
}

function classify(x: number, y: number): QuadrantKey {
  if (y >= 50 && x >= 50) return 'estrella';
  if (y >= 50 && x < 50) return 'estrategicos';
  if (y < 50 && x >= 50) return 'mejorasRapidas';
  return 'reconsiderar';
}

function PointTooltip({ active, payload }: any) {
  if (!active || !payload || !payload[0]) return null;
  const p: Point = payload[0].payload;
  const meta = QUADRANT_META[p.quadrant];
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-lg max-w-xs">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: meta.dot }}
        />
        <p className="font-headline text-sm font-semibold leading-tight">
          {p.name}
        </p>
      </div>
      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {p.postulante && <p>{p.postulante}</p>}
        {p.area && <p>{p.area}</p>}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div>
          <p className="text-muted-foreground">Impacto Estr.</p>
          <p className="font-mono font-bold">{p.y.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Facilidad</p>
          <p className="font-mono font-bold">{p.x.toFixed(1)}</p>
        </div>
      </div>
      <div className="mt-2 border-t pt-1.5 text-[10px] uppercase tracking-wider font-semibold" style={{ color: meta.stroke }}>
        {meta.label}
      </div>
    </div>
  );
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const p: Point = payload;
  const meta = QUADRANT_META[p.quadrant];
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={9}
        fill={meta.dot}
        fillOpacity={0.2}
        stroke={meta.dot}
        strokeOpacity={0.5}
      />
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={meta.dot}
        stroke="white"
        strokeWidth={2}
      />
    </g>
  );
}

export function PriorityMatrix({ results }: { results: IdeaWithTotals[] }) {
  const points = useMemo<Point[]>(() => {
    return results
      .filter((idea) => idea.ratingCount > 0)
      .map((idea) => {
        const { x, y } = computeAxes(idea);
        return {
          id: idea.id,
          name: idea.nombreSolucion || idea.name,
          postulante: idea.postulante ?? '',
          area: idea.area,
          x,
          y,
          weightedTotal: idea.totalScores.weightedTotal,
          quadrant: classify(x, y),
        };
      });
  }, [results]);

  const counts = useMemo(() => {
    const acc: Record<QuadrantKey, number> = {
      estrella: 0,
      estrategicos: 0,
      mejorasRapidas: 0,
      reconsiderar: 0,
    };
    for (const p of points) acc[p.quadrant] += 1;
    return acc;
  }, [points]);

  if (points.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-semibold text-muted-foreground">
            Sin datos para graficar
          </p>
          <p className="text-sm text-muted-foreground/80">
            La matriz aparecerá cuando haya iniciativas con al menos una
            calificación.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            {QUADRANT_ORDER.map((q) => {
              const meta = QUADRANT_META[q];
              const Icon = meta.icon;
              return (
                <Badge
                  key={q}
                  variant="outline"
                  className={cn(
                    'gap-1.5 px-2.5 py-1 text-xs font-medium',
                    meta.chip
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                  <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/70 px-1 text-[10px] font-bold tabular-nums">
                    {counts[q]}
                  </span>
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="h-[520px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 24, right: 32, bottom: 56, left: 56 }}
              >
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="2 4" />

                <ReferenceArea
                  x1={50}
                  x2={100}
                  y1={50}
                  y2={100}
                  fill={QUADRANT_META.estrella.fill}
                  stroke="none"
                />
                <ReferenceArea
                  x1={0}
                  x2={50}
                  y1={50}
                  y2={100}
                  fill={QUADRANT_META.estrategicos.fill}
                  stroke="none"
                />
                <ReferenceArea
                  x1={50}
                  x2={100}
                  y1={0}
                  y2={50}
                  fill={QUADRANT_META.mejorasRapidas.fill}
                  stroke="none"
                />
                <ReferenceArea
                  x1={0}
                  x2={50}
                  y1={0}
                  y2={50}
                  fill={QUADRANT_META.reconsiderar.fill}
                  stroke="none"
                />

                <ReferenceLine
                  x={50}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <ReferenceLine
                  y={50}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />

                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  label={{
                    value: 'Facilidad de Implementación (40%)',
                    position: 'bottom',
                    offset: 24,
                    style: {
                      fill: '#475569',
                      fontSize: 12,
                      fontWeight: 600,
                    },
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  label={{
                    value: 'Impacto Estratégico (60%)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: -8,
                    style: {
                      fill: '#475569',
                      fontSize: 12,
                      fontWeight: 600,
                      textAnchor: 'middle',
                    },
                  }}
                />

                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }}
                  content={<PointTooltip />}
                />

                <Scatter data={points} shape={<CustomDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground sm:flex sm:items-center sm:justify-center sm:gap-4">
            <span>
              <span className="font-semibold">Y</span>: Estrategia · Impacto ·
              Innovación
            </span>
            <span>
              <span className="font-semibold">X</span>: Técnico (datos,
              factibilidad, tiempo)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
