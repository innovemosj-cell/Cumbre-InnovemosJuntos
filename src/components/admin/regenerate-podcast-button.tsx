'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { regeneratePodcastAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
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
import {
  AlertCircle,
  CheckCircle2,
  Headphones,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'processing' | 'success' | 'error';

type Props = {
  ideaId: string;
  ideaName: string;
  hasAudio: boolean;
  onSuccess?: (audioUrl: string) => void;
};

export function RegeneratePodcastButton({
  ideaId,
  ideaName,
  hasAudio,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const router = useRouter();

  const reset = () => {
    setPhase('idle');
    setAudioUrl(null);
    setErrorMessage(null);
    setElapsedMs(null);
  };

  const handleRun = async () => {
    setPhase('processing');
    setAudioUrl(null);
    setErrorMessage(null);
    const startedAt = Date.now();
    try {
      const res = await regeneratePodcastAction(ideaId);
      setElapsedMs(Date.now() - startedAt);
      if (res.success && res.audioUrl) {
        setPhase('success');
        setAudioUrl(res.audioUrl);
        onSuccess?.(res.audioUrl);
        router.refresh();
      } else {
        setPhase('error');
        setErrorMessage(res.message);
      }
    } catch (e: any) {
      setElapsedMs(Date.now() - startedAt);
      setPhase('error');
      setErrorMessage(e?.message ?? 'Error de red');
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (phase === 'processing') return; // No cerrar mientras corre
    setOpen(next);
    if (!next) reset();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={hasAudio ? 'Regenerar audio podcast' : 'Generar audio podcast'}
          className={cn(hasAudio && 'text-primary hover:text-primary')}
        >
          <Headphones className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            {hasAudio ? 'Regenerar audio podcast' : 'Generar audio podcast'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2 text-sm">
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Iniciativa
                </p>
                <p className="font-medium leading-tight">{ideaName}</p>
              </div>

              {phase === 'idle' && (
                <>
                  <p>
                    Se va a generar el audio (problema + hipótesis IA +
                    indicadores de valor) con Google Gemini TTS y se subirá a
                    Firebase Storage.
                  </p>
                  <p className="text-muted-foreground">
                    Toma <strong>5 a 15 segundos</strong>. Después los jurados
                    lo reproducen al instante.
                  </p>
                  {hasAudio && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                      ⚠️ Ya existe un audio. Será <strong>reemplazado</strong>.
                    </p>
                  )}
                </>
              )}

              {phase === 'processing' && (
                <div className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 p-3">
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                  <div className="min-w-0">
                    <p className="font-medium">Generando audio…</p>
                    <p className="text-xs text-muted-foreground">
                      Llamando a Google TTS y subiendo a Firebase Storage. No
                      cierres esta ventana.
                    </p>
                  </div>
                </div>
              )}

              {phase === 'success' && audioUrl && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-emerald-900">
                        Audio generado correctamente
                      </p>
                      {elapsedMs && (
                        <p className="mt-0.5 text-xs text-emerald-800/80">
                          Tiempo: {(elapsedMs / 1000).toFixed(1)}s. Ya
                          disponible para los jurados.
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Vista previa
                    </p>
                    <audio
                      controls
                      src={audioUrl}
                      className="w-full"
                      preload="metadata"
                    />
                  </div>
                </div>
              )}

              {phase === 'error' && errorMessage && (
                <div className="space-y-2 rounded-md border border-rose-200 bg-rose-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-rose-900">
                        No se pudo generar el audio
                      </p>
                      {elapsedMs && (
                        <p className="text-xs text-rose-700/70">
                          Falló después de {(elapsedMs / 1000).toFixed(1)}s
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-md bg-white/60 px-3 py-2 font-mono text-xs leading-relaxed text-rose-900 break-words">
                    {errorMessage}
                  </div>
                  <p className="text-xs text-rose-800/80">
                    {hintForError(errorMessage)}
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {phase === 'idle' && (
            <>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <Button onClick={handleRun} className="gap-2">
                <Sparkles className="h-4 w-4" />
                {hasAudio ? 'Sí, regenerar' : 'Generar audio'}
              </Button>
            </>
          )}
          {phase === 'processing' && (
            <Button disabled className="gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando…
            </Button>
          )}
          {phase === 'success' && (
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          )}
          {phase === 'error' && (
            <>
              <AlertDialogCancel>Cerrar</AlertDialogCancel>
              <Button onClick={handleRun} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function hintForError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('429') || lower.includes('too many')) {
    return 'Límite de Google Gemini superado. Espera 30-60s antes de reintentar.';
  }
  if (lower.includes('400') && lower.includes('bucket')) {
    return 'El bucket de Firebase Storage tiene un nombre incorrecto en .env.';
  }
  if (lower.includes('403') || lower.includes('permission')) {
    return 'El service account no tiene permisos sobre Firebase Storage.';
  }
  if (lower.includes('401')) {
    return 'API key inválida o expirada.';
  }
  if (lower.includes('404')) {
    return 'Recurso no encontrado. Verifica bucket name y configuración.';
  }
  return 'Revisa la consola del servidor para más detalles.';
}
