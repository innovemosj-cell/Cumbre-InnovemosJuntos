'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, LogOut } from 'lucide-react';
import { Logo } from '../icons/logo';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getNavItems } from '@/lib/nav-items';

interface MobileNavProps {
  user: User;
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const userNavItems = getNavItems(user);

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
      setOpen(false);
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <SheetHeader className="p-4">
          <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
        </SheetHeader>
        <Link
          href="/dashboard"
          className="mr-6 flex items-center space-x-2 px-4"
          onClick={() => setOpen(false)}
        >
          <Logo className="h-6 w-6 text-primary" />
          <span className="font-bold">CalificApp</span>
        </Link>
        <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
          <div className="flex flex-col space-y-3">
            {userNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'transition-colors',
                  pathname?.startsWith(item.href)
                    ? 'font-bold text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 pl-6">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={onLogout}
            disabled={isPending}
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
