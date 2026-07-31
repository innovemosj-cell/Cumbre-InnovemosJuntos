import type { Category } from './types';

export type CategoryGroup<T> = {
  key: string;
  title: string;
  description: string;
  items: T[];
};

// Agrupa cualquier lista de elementos con categoryId según el orden de las
// categorías. Los elementos sin categoría (o con una categoría eliminada)
// quedan en un grupo "Sin categoría" al final. Los grupos vacíos se omiten.
export function groupByCategory<T extends { categoryId?: string }>(
  items: T[],
  categories: Category[]
): CategoryGroup<T>[] {
  const groups: CategoryGroup<T>[] = categories
    .map((category) => ({
      key: category.id,
      title: category.title,
      description: category.description,
      items: items.filter((i) => i.categoryId === category.id),
    }))
    .filter((g) => g.items.length > 0);

  const categoryIds = new Set(categories.map((c) => c.id));
  const uncategorized = items.filter(
    (i) => !i.categoryId || !categoryIds.has(i.categoryId)
  );
  if (uncategorized.length > 0) {
    groups.push({
      key: 'sin-categoria',
      title: 'Sin categoría',
      description: '',
      items: uncategorized,
    });
  }
  return groups;
}
