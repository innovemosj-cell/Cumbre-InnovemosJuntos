'use client';

// Sección de la ficha de la iniciativa (Problema, Hipótesis IA, etc.).
// Toda la tarjeta funciona como un toggle: un click la abre y otro la
// cierra. Cerrada muestra una muestra corta del texto (2 líneas).
//
// Notas de compatibilidad móvil:
// - El preview colapsado usa el texto SIN saltos de línea: WebKit (Safari
//   de iPhone) rompe line-clamp cuando se combina con whitespace-pre-line
//   y el texto trae saltos, desbordando el contenido de la tarjeta.
// - El contenedor clickeable es un div con role="button" (no <button>):
//   un <button> no admite contenido de bloque (h3/p) y los navegadores
//   móviles lo renderizan de forma inconsistente.

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ChevronDown,
  Lightbulb,
  Target,
  Zap,
} from 'lucide-react';

// El icono se pasa por nombre porque los componentes de servidor no pueden
// enviar funciones (el componente del icono) a un componente cliente.
const ICONS = {
  alert: AlertCircle,
  lightbulb: Lightbulb,
  target: Target,
  zap: Zap,
} as const;

export function InfoSection({
  title,
  icon,
  content,
  accent,
}: {
  title: string;
  icon: keyof typeof ICONS;
  content?: string;
  accent?: string;
}) {
  const [open, setOpen] = useState(false);
  const text = content?.trim();
  if (!text) return null;
  const Icon = ICONS[icon];
  const preview = text.replace(/\s+/g, ' ');

  const toggle = () => setOpen((v) => !v);

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={`${title}: ${open ? 'contraer' : 'expandir'}`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        className="w-full cursor-pointer select-none p-5 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent ?? 'bg-muted text-foreground'}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <h3 className="font-headline text-base font-semibold">{title}</h3>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </div>
        {open ? (
          <p className="mt-2 select-text whitespace-pre-line break-words text-sm leading-relaxed text-foreground/90">
            {text}
          </p>
        ) : (
          <p className="mt-2 line-clamp-2 break-words text-sm leading-relaxed text-foreground/90">
            {preview}
          </p>
        )}
      </div>
    </section>
  );
}
