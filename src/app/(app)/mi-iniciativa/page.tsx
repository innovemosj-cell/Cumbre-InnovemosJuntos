import { MyIdeaEditor } from '@/components/team/my-idea-editor';
import { getIdeaById } from '@/lib/data';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export const runtime = 'edge';

export default async function MiIniciativaPage() {
  const { user } = await getSession();
  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'Equipo') {
    redirect('/dashboard');
  }
  if (user.active === false) {
    return (
      <div className="container mx-auto max-w-xl py-16 text-center">
        <h1 className="font-headline text-2xl font-bold tracking-tight">
          Acceso pausado
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tu acceso está temporalmente deshabilitado por el organizador. Si
          necesitas volver a editar tu iniciativa, escríbele al administrador
          del hackathon.
        </p>
      </div>
    );
  }
  if (!user.teamIdeaId) {
    return (
      <div className="container mx-auto max-w-xl py-16 text-center">
        <h1 className="font-headline text-2xl font-bold tracking-tight">
          Iniciativa no asignada
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tu usuario todavía no tiene una iniciativa asociada. Contacta al
          administrador del hackathon para que la asigne.
        </p>
      </div>
    );
  }

  const idea = await getIdeaById(user.teamIdeaId);
  if (!idea) {
    return (
      <div className="container mx-auto max-w-xl py-16 text-center">
        <h1 className="font-headline text-2xl font-bold tracking-tight">
          Iniciativa no encontrada
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          La iniciativa asignada a tu usuario no existe o fue eliminada.
          Contacta al administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-6">
      <div>
        <h1 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">
          Mi iniciativa
        </h1>
        <p className="text-muted-foreground">
          Edita los campos que verán los jurados. Sé conciso y estratégico.
        </p>
      </div>
      <MyIdeaEditor idea={idea} />
    </div>
  );
}
