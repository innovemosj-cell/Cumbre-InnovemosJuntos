import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Texto libre del campo `eficienciaFTE`, tal como lo escribió el equipo
// (máx. 150 caracteres en los formularios). Los valores antiguos más largos
// se recortan solo para la visualización.
export function formatFTE(raw: string | undefined | null): string {
  const text = raw?.trim() ?? '';
  if (!text) return '';
  return text.length > 150 ? `${text.slice(0, 150).trimEnd()}…` : text;
}
