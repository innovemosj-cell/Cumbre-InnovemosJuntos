'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { User, UserRole } from '@/lib/types';
import { Briefcase, LogOut, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

const ROLE_STYLES: Record<UserRole, string> = {
  Jurado: 'bg-sky-100 text-sky-700 ring-sky-200',
  Admin: 'bg-violet-100 text-violet-700 ring-violet-200',
  Organizer: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  Equipo: 'bg-amber-100 text-amber-800 ring-amber-200',
};

export function UserNav({ user }: { user: User }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initials = user.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const isJurado = user.role === 'Jurado';

  function onLogout() {
    startTransition(async () => {
      // API Route en vez de server action: las actions hacen POST a la página
      // actual y en CF Pages fallan (404) en rutas dinámicas como /ideas/[id],
      // dejando la cookie de sesión sin borrar.
      try {
        await fetch('/api/logout', { method: 'POST' });
      } catch (e) {
        console.error('logout error', e);
      }
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 p-0" align="end" forceMount>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-3 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
            <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {user.name}
              </p>
              {!isJurado && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <div className="space-y-2 px-3 py-3">
          {isJurado && user.rolOrganizacion && (
            <div className="flex items-start gap-2.5 rounded-md bg-muted/50 px-3 py-2">
              <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Rol en la organización
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                  {user.rolOrganizacion}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded-md bg-muted/50 px-3 py-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Rol en la plataforma
              </p>
              <span
                className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${ROLE_STYLES[user.role]}`}
              >
                {user.role}
              </span>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="my-0" />
        <div className="p-1">
          <DropdownMenuItem asChild>
            <button
              type="button"
              onClick={onLogout}
              disabled={isPending}
              className="w-full cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive disabled:opacity-60"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </button>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
