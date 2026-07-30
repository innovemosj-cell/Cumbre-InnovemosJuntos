import { CreateUserForm } from '@/components/admin/create-user-form';
import { UserList } from '@/components/admin/user-list';
import { getIdeas, getUsers } from '@/lib/data';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export const runtime = 'edge';

export default async function AdminUsersPage() {
  const { user } = await getSession();

  if (!user || user.role !== 'Admin') {
    redirect('/dashboard');
  }

  const [users, ideas] = await Promise.all([getUsers(), getIdeas()]);
  const ideaOptions = ideas.map((i) => ({
    id: i.id,
    label: i.nombreSolucion || i.name,
    codigo: i.codigo,
  }));

  return (
    <div className="container mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Gestionar Usuarios
        </h1>
        <p className="text-muted-foreground">
          Crea nuevos usuarios y visualiza los existentes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
        <div className="md:col-span-1">
          <CreateUserForm ideaOptions={ideaOptions} />
        </div>
        <div className="md:col-span-2">
          <UserList users={users} ideaOptions={ideaOptions} />
        </div>
      </div>
    </div>
  );
}
