import { MainNav } from './main-nav';
import { MobileNav } from './mobile-nav';
import { UserNav } from './user-nav';
import { User } from '@/lib/types';

export async function AppHeader({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4 sm:px-6 lg:px-8">
        <MainNav user={user} />
        <MobileNav user={user} />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <UserNav user={user} />
          </nav>
        </div>
      </div>
    </header>
  );
}
