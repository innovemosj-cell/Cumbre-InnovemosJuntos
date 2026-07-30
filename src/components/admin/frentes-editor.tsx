'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { FrenteKey } from '@/lib/types';
import { updateUserAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Loader2, Target, Zap, Lightbulb, Wrench } from 'lucide-react';

type FrenteDef = {
  key: FrenteKey;
  label: string;
  Icon: any;
  iconColor: string;
  trackOn: string;
};

const FRENTES: FrenteDef[] = [
  {
    key: 'estrategia',
    label: 'Estrategia',
    Icon: Target,
    iconColor: 'text-sky-600',
    trackOn: 'data-[state=checked]:bg-sky-500',
  },
  {
    key: 'impacto',
    label: 'Impacto',
    Icon: Zap,
    iconColor: 'text-rose-600',
    trackOn: 'data-[state=checked]:bg-rose-500',
  },
  {
    key: 'innovacion',
    label: 'Innovación',
    Icon: Lightbulb,
    iconColor: 'text-violet-600',
    trackOn: 'data-[state=checked]:bg-violet-500',
  },
  {
    key: 'tecnico',
    label: 'Técnico',
    Icon: Wrench,
    iconColor: 'text-emerald-600',
    trackOn: 'data-[state=checked]:bg-emerald-500',
  },
];

export function FrentesEditor({
  userId,
  initial,
  disabled,
}: {
  userId: string;
  initial: FrenteKey[];
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<FrenteKey[]>(initial);
  const [pendingKey, setPendingKey] = useState<FrenteKey | null>(null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function toggle(key: FrenteKey, next: boolean) {
    const updated = next
      ? [...selected, key]
      : selected.filter((k) => k !== key);
    const previous = selected;
    setSelected(updated);
    setPendingKey(key);
    startTransition(async () => {
      const result = await updateUserAction(userId, { frentesAEvaluar: updated });
      setPendingKey(null);
      if (!result.success) {
        setSelected(previous);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 min-w-[280px]">
      {FRENTES.map((f) => {
        const active = selected.includes(f.key);
        const isPending = pendingKey === f.key;
        return (
          <label
            key={f.key}
            className={cn(
              'group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
              !disabled && 'hover:bg-muted/40',
              disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            <Switch
              checked={active}
              onCheckedChange={(v) => toggle(f.key, v)}
              disabled={disabled || isPending}
              className={cn(f.trackOn)}
            />
            <f.Icon
              className={cn(
                'h-3.5 w-3.5 shrink-0 transition-colors',
                active ? f.iconColor : 'text-muted-foreground/50'
              )}
            />
            <span
              className={cn(
                'text-xs font-medium transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {f.label}
            </span>
            {isPending && (
              <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </label>
        );
      })}
    </div>
  );
}
