'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/icons/logo';
import { getNavItems } from '@/lib/nav-items';

export function MainNav({ user }: { user: User }) {
  const pathname = usePathname();
  const userNavItems = getNavItems(user);


  return (
    <div className="mr-4 hidden md:flex">
      <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
        <Logo className="h-6 w-6 text-primary" />
        <span className="hidden font-bold sm:inline-block">CalificApp</span>
      </Link>
      <nav className="flex items-center gap-6 text-sm">
        {userNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'transition-colors hover:text-foreground/80',
              pathname?.startsWith(item.href)
                ? 'text-foreground'
                : 'text-foreground/60'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
