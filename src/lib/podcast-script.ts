import type { Idea } from './types';

export type PodcastSection = {
  heading: string;
  body: string;
};

function clean(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/\r?\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .replace(/\.\.+/g, '.')
    .replace(/\s+\./g, '.')
    .trim();
}

export function buildPodcastSections(idea: Idea): PodcastSection[] {
  const sections: PodcastSection[] = [];

  if (idea.problema) {
    sections.push({
      heading: 'Problema',
      body: `Problema: ${clean(idea.problema)}`,
    });
  }

  if (idea.hipotesisIA) {
    sections.push({
      heading: 'Hipótesis de IA',
      body: `Hipótesis: ${clean(idea.hipotesisIA)}`,
    });
  }

  if (idea.indicadoresValor) {
    sections.push({
      heading: 'Indicadores de valor',
      body: `Indicadores de valor: ${clean(idea.indicadoresValor)}`,
    });
  }

  return sections;
}

export function buildPodcastScript(idea: Idea): string {
  return buildPodcastSections(idea)
    .map((s) => s.body)
    .filter(Boolean)
    .join(' ... ');
}

export function estimateDurationSeconds(text: string, rate = 1): number {
  // ~150 palabras por minuto en español a rate 1
  const words = text.split(/\s+/).length;
  return Math.round((words / 150) * 60 / rate);
}
