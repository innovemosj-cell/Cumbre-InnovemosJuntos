'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { User, UserRole } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { CopyCredentials } from './copy-credentials';
import { DeleteUserButton } from './delete-user-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { setJurorActiveAction, updateUserAction } from '@/lib/actions';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { FrentesEditor } from './frentes-editor';

type IdeaOption = { id: string; label: string; codigo?: string };

type UserListProps = {
  users: User[];
  ideaOptions?: IdeaOption[];
};

export function UserList({ users, ideaOptions = [] }: UserListProps) {
  const [localUsers, setLocalUsers] = useState(users);
  const [searchQuery, setSearchQuery] = useState('');

  // Sincroniza con los usuarios que llegan del servidor: tras crear un
  // usuario, el router.refresh() del formulario trae la lista nueva y sin
  // esto la tabla seguía mostrando el estado local viejo.
  useEffect(() => {
    setLocalUsers(users);
  }, [users]);
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const ideaLabelById = new Map(
    ideaOptions.map((o) => [
      o.id,
      o.codigo ? `#${o.codigo} · ${o.label}` : o.label,
    ])
  );

  const handleTeamIdeaChange = (userId: string, teamIdeaId: string) => {
    setLocalUsers((curr) =>
      curr.map((u) => (u.id === userId ? { ...u, teamIdeaId } : u))
    );
    startTransition(async () => {
      const result = await updateUserAction(userId, { teamIdeaId });
      if (result.success) {
        toast({ title: 'Listo', description: 'Iniciativa asignada.' });
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    });
  };

  const handleRoleChange = (userId: string, role: UserRole) => {
    startTransition(async () => {
      const result = await updateUserAction(userId, { role });
      const newRole = result.success ? result.data?.role : undefined;
      if (result.success && newRole) {
        toast({
          title: 'Éxito',
          description: 'El rol del usuario ha sido actualizado.',
        });
        setLocalUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user
          )
        );
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  };

  const handleGenerateNewCode = (userId: string) => {
    const newLoginCode = Math.floor(1000 + Math.random() * 9000).toString();
    startTransition(async () => {
      const result = await updateUserAction(userId, {
        loginCode: newLoginCode,
      });
      if (result.success && result.data?.loginCode) {
        toast({
          title: 'Éxito',
          description: 'Nuevo código de acceso generado.',
        });
        setLocalUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === userId
              ? { ...user, loginCode: result.data.loginCode }
              : user
          )
        );
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  };

  const toggleVisibility = (userId: string) => {
    setVisibleCodes((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleToggleActive = (userId: string, nextActive: boolean) => {
    // Optimistic update.
    setLocalUsers((curr) =>
      curr.map((u) => (u.id === userId ? { ...u, active: nextActive } : u))
    );
    startTransition(async () => {
      const result = await setJurorActiveAction(userId, { active: nextActive });
      if (result.success) {
        toast({ title: 'Listo', description: result.message });
        router.refresh();
      } else {
        // Rollback en caso de error.
        setLocalUsers((curr) =>
          curr.map((u) =>
            u.id === userId ? { ...u, active: !nextActive } : u
          )
        );
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  };

  const filteredUsers = localUsers.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const jurorsActive = filteredUsers.filter(
    (u) => u.role === 'Jurado' && u.active !== false
  );
  const jurorsInactive = filteredUsers.filter(
    (u) => u.role === 'Jurado' && u.active === false
  );
  const teams = filteredUsers.filter((u) => u.role === 'Equipo');
  const others = filteredUsers.filter(
    (u) => u.role !== 'Jurado' && u.role !== 'Equipo'
  );

  const renderRow = (user: User) => (
    <TableRow key={user.id}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>
              {user.name ? user.name.charAt(0) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {user.name || 'Usuario sin nombre'}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email || 'Correo no disponible'}
            </p>
            {user.role === 'Jurado' && user.rolOrganizacion && (
              <p className="truncate text-xs text-muted-foreground italic">
                {user.rolOrganizacion}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={user.role}
          onValueChange={(value: UserRole) =>
            handleRoleChange(user.id, value)
          }
          disabled={isPending}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Seleccionar rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Jurado">Jurado</SelectItem>
            <SelectItem value="Equipo">Equipo</SelectItem>
            <SelectItem value="Organizer">Organizer</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {user.role === 'Jurado' || user.role === 'Equipo' ? (
          <div className="flex items-center gap-2">
            <Switch
              checked={user.active !== false}
              onCheckedChange={(v) => handleToggleActive(user.id, v)}
              disabled={isPending}
              aria-label={
                user.active !== false
                  ? 'Desactivar acceso'
                  : 'Activar acceso'
              }
            />
            <span
              className={
                'text-xs font-medium ' +
                (user.active !== false
                  ? 'text-emerald-700'
                  : 'text-muted-foreground')
              }
            >
              {user.active !== false ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="pr-6">
        {user.role === 'Jurado' ? (
          <FrentesEditor
            userId={user.id}
            initial={user.frentesAEvaluar ?? []}
            disabled={isPending}
          />
        ) : user.role === 'Equipo' ? (
          <Select
            value={user.teamIdeaId || undefined}
            onValueChange={(v) => handleTeamIdeaChange(user.id, v)}
            disabled={isPending}
          >
            <SelectTrigger className="w-full min-w-[240px]">
              <SelectValue placeholder="Selecciona iniciativa" />
            </SelectTrigger>
            <SelectContent>
              {ideaOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Sin iniciativas.
                </div>
              ) : (
                ideaOptions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.codigo ? `#${i.codigo} · ` : ''}
                    {i.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <span className="inline-flex min-w-[90px] items-center justify-center rounded-md border bg-muted/40 px-3 py-1.5 font-mono text-sm tracking-widest">
          {visibleCodes[user.id]
            ? user.loginCode || 'No asignado'
            : '••••'}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleVisibility(user.id)}
            disabled={isPending}
            aria-label={
              visibleCodes[user.id] ? 'Ocultar código' : 'Ver código'
            }
          >
            {visibleCodes[user.id] ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleGenerateNewCode(user.id)}
            disabled={isPending}
            aria-label="Generar nuevo código"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <CopyCredentials user={user} />
          <DeleteUserButton
            user={user}
            disabled={isPending}
            onDeleted={(userId) => {
              setLocalUsers((curr) => curr.filter((u) => u.id !== userId));
              router.refresh();
            }}
          />
        </div>
      </TableCell>
    </TableRow>
  );

  const renderTable = (users: User[], emptyText: string) => (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[220px]">Usuario</TableHead>
          <TableHead className="w-[140px]">Rol</TableHead>
          <TableHead className="w-[120px]">Estado</TableHead>
          <TableHead className="min-w-[300px]">Frentes / Iniciativa</TableHead>
          <TableHead className="w-[180px]">Código de Acceso</TableHead>
          <TableHead className="w-[160px] text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </TableCell>
          </TableRow>
        ) : (
          users.map(renderRow)
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4">
        <Input
          placeholder="Buscar por nombre o correo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <section className="rounded-lg border">
        <div className="flex items-center justify-between border-b bg-emerald-50/50 px-4 py-3">
          <h3 className="font-headline text-sm font-semibold text-emerald-900">
            Jurados activos
          </h3>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
            {jurorsActive.length}
          </span>
        </div>
        {renderTable(jurorsActive, 'No hay jurados activos.')}
      </section>

      <section className="rounded-lg border">
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
          <h3 className="font-headline text-sm font-semibold text-muted-foreground">
            Jurados desactivados
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {jurorsInactive.length}
          </span>
        </div>
        {renderTable(jurorsInactive, 'No hay jurados desactivados.')}
      </section>

      <section className="rounded-lg border">
        <div className="flex items-center justify-between border-b bg-violet-50/60 px-4 py-3">
          <h3 className="font-headline text-sm font-semibold text-violet-900">
            Equipos
          </h3>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900">
            {teams.length}
          </span>
        </div>
        {renderTable(
          teams,
          'No hay equipos. Créalos desde el formulario de la izquierda seleccionando el rol Equipo.'
        )}
      </section>

      <section className="rounded-lg border">
        <div className="flex items-center justify-between border-b bg-sky-50/50 px-4 py-3">
          <h3 className="font-headline text-sm font-semibold text-sky-900">
            Administradores y organizadores
          </h3>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
            {others.length}
          </span>
        </div>
        {renderTable(others, 'No hay otros usuarios.')}
      </section>
    </div>
  );
}
