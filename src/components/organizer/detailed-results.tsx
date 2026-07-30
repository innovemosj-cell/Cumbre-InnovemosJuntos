'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';

export function DetailedResults() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleDownload() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/export-evaluaciones', { method: 'GET' });
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
      const cd = res.headers.get('content-disposition') ?? '';
      const match = cd.match(/filename="([^"]+)"/);
      const filename =
        match?.[1] ??
        `evaluaciones-hackathon-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
        description: 'Incluye detalle por jurado, resumen y estado de jurados.',
      });
    } catch (e: any) {
      console.error('[detailed-results] error', { message: e?.message });
      toast({
        variant: 'destructive',
        title: 'Error al exportar',
        description: 'No se pudo descargar el archivo. Intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
          <div>
            <CardTitle>Exportar evaluaciones</CardTitle>
            <CardDescription>
              Descarga un <strong>.xlsx</strong> con 3 hojas: detalle por
              jurado (scores por criterio), resumen por iniciativa (totales y
              ponderados) y estado de jurados.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button onClick={handleDownload} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Generando…' : 'Descargar XLSX'}
        </Button>
      </CardContent>
    </Card>
  );
}
