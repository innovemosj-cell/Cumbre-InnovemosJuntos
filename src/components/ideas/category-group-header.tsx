import { Layers } from 'lucide-react';

// Encabezado de un grupo de categoría: título, contador y descripción.
// Se usa en todas las vistas que dividen las iniciativas por categoría
// (dashboard, mis calificaciones, admin y organizador) para que el
// lenguaje visual sea el mismo en toda la app.
export function CategoryGroupHeader({
  title,
  description,
  count,
  countLabel = 'iniciativa',
}: {
  title: string;
  description?: string;
  count: number;
  countLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
        <Layers className="h-4 w-4 text-violet-600" />
      </div>
      <div>
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="font-headline text-xl font-semibold">{title}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {count} {countLabel}
            {count === 1 ? '' : 's'}
          </span>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
