// Página PÚBLICA de votación del público (sin login). Vive fuera del grupo
// (app) para no exigir sesión. La lista de iniciativas viene del snapshot
// cacheado en memoria (30 s) para que cientos de asistentes simultáneos no
// multipliquen las lecturas de Firestore.

import { cookies } from 'next/headers';
import { PublicVoteList } from '@/components/public/public-vote-list';
import { Logo } from '@/components/icons/logo';
import { getPublicVoteForVoter, getPublicVotingSnapshot } from '@/lib/data';

export const runtime = 'edge';

export const metadata = {
  title: 'Vota por tu idea favorita',
};

export default async function VotacionPage() {
  const [snapshot, cookieStore] = await Promise.all([
    getPublicVotingSnapshot(),
    cookies(),
  ]);

  // Si el asistente ya tiene cookie de votante, verificamos si ya votó
  // (1 lectura solo para visitantes recurrentes).
  const voterId = cookieStore.get('publicVoterId')?.value;
  let votedIdeaId: string | null = null;
  if (voterId && /^[0-9a-f-]{36}$/i.test(voterId)) {
    try {
      const vote = await getPublicVoteForVoter(voterId);
      votedIdeaId = vote?.ideaId ?? null;
    } catch (e: any) {
      // Si falla la lectura, la página sigue; el POST valida de nuevo.
      console.error('[votacion] no se pudo leer el voto:', {
        message: e?.message,
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Logo className="h-6 w-6 text-primary" />
          <span className="font-bold">CalificApp</span>
          <span className="text-sm text-muted-foreground">
            · Votación del público
          </span>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
            Vota por tu idea favorita
          </h1>
          <p className="mt-2 text-muted-foreground">
            Elige la iniciativa que más te gustó. Solo puedes votar una vez.
          </p>
        </div>

        <PublicVoteList
          ideas={snapshot.ideas}
          open={snapshot.open}
          votedIdeaId={votedIdeaId}
        />
      </main>
    </div>
  );
}
