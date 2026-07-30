'use client';

import { useEffect, useRef, useState } from 'react';
import type { Idea } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  AlertCircle,
  Headphones,
  Pause,
  Play,
  Square,
} from 'lucide-react';

const SPEED_OPTIONS = [
  { value: '0.85', label: '0.85x' },
  { value: '1', label: '1x' },
  { value: '1.15', label: '1.15x' },
  { value: '1.3', label: '1.3x' },
  { value: '1.5', label: '1.5x' },
];

type Status = 'idle' | 'playing' | 'paused';

export function PodcastPlayer({ idea }: { idea: Idea }) {
  const [status, setStatus] = useState<Status>('idle');
  const [rate, setRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioUrl = idea.audioUrl;

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  if (!audioUrl) {
    return (
      <Card className="flex items-start gap-3 border-dashed bg-muted/30 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="text-sm">
          <p className="font-medium">Audio aún no disponible</p>
          <p className="text-muted-foreground">
            El administrador puede generar el audio de esta iniciativa desde la
            sección de Iniciativas.
          </p>
        </div>
      </Card>
    );
  }

  const play = () => audioRef.current?.play();
  const pause = () => audioRef.current?.pause();
  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setStatus('idle');
    setCurrentTime(0);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <Headphones className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-headline text-sm font-semibold">
            Escuchar resumen
          </p>
          <p className="text-xs text-muted-foreground">
            {status === 'idle'
              ? duration
                ? `Duración: ${formatTime(duration)}`
                : 'Listo para reproducir'
              : `${formatTime(currentTime)} / ${formatTime(duration)}`}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {status === 'idle' && (
            <Button onClick={play} size="sm" className="gap-2">
              <Play className="h-4 w-4" />
              Reproducir
            </Button>
          )}
          {status === 'playing' && (
            <Button onClick={pause} size="sm" className="gap-2">
              <Pause className="h-4 w-4" /> Pausar
            </Button>
          )}
          {status === 'paused' && (
            <Button onClick={play} size="sm" className="gap-2">
              <Play className="h-4 w-4" /> Reanudar
            </Button>
          )}
          {status !== 'idle' && (
            <Button onClick={stop} size="sm" variant="ghost" className="gap-2">
              <Square className="h-4 w-4" />
              Detener
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Velocidad
            </label>
            <Select value={String(rate)} onValueChange={(v) => setRate(Number(v))}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPEED_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onPlay={() => setStatus('playing')}
          onPause={() => {
            if (audioRef.current && !audioRef.current.ended) {
              setStatus('paused');
            }
          }}
          onEnded={() => {
            setStatus('idle');
            setCurrentTime(0);
          }}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          controls
          className="w-full"
        />
      </div>
    </Card>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
