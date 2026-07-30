'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';

// variant 'card' = tarjeta explicativa (panel admin); 'inline' = botón
// compacto para encabezados (panel del organizador). Ambos descargan el
// mismo XLSX según el modo actual (preselección o evaluación final).
export function ExportEvaluacionesButton({
  variant = 'card',
}: {
  variant?: 'card' | 'inline';
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleDownload() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/export-evaluaciones', {
        method: 'GET',
      });
      if (!res.ok) {
        let msg = 'No se pudo generar el archivo.';
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {}
        toast({
          variant: 'destructive',
          title: 'Error al exportar',
          description: msg,
        });
        return;
      }
      const blob = await res.blob();
      // Extraer filename del header content-disposition.
      const cd = res.headers.get('content-disposition') ?? '';
      const match = cd.match(/filename="([^"]+)"/);
      const filename =
        match?.[1] ?? `evaluaciones-hackathon-${new Date().toISOString().slice(0, 10)}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({
        title: 'Archivo descargado',
        description: 'Contiene las calificaciones de la etapa actual.',
      });
    } catch (e: any) {
      console.error('[export-evaluaciones] error', { message: e?.message });
      toast({
        variant: 'destructive',
        title: 'Error al exportar',
        description: 'No se pudo descargar el archivo. Intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (variant === 'inline') {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleDownload}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {isLoading ? 'Generando…' : 'Exportar XLSX'}
      </Button>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-headline text-base font-semibold">
            Exportar evaluaciones
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Descarga un archivo <strong>.xlsx</strong> con las calificaciones
            de la etapa actual — evaluación final o preselección según el modo
            activo — (detalle por jurado + resumen por iniciativa + estado de
            jurados). Hazlo antes de reiniciar los votos para guardar el
            histórico.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-4 gap-2"
            onClick={handleDownload}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isLoading ? 'Generando…' : 'Descargar XLSX'}
          </Button>
        </div>
      </div>
    </div>
  );
}
