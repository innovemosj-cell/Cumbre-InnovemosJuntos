'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createUserAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  createUserFormSchema,
  CreateUserFormValues,
} from '@/lib/schemas';
import { RefreshCw } from 'lucide-react';

type IdeaOption = { id: string; label: string; codigo?: string };

export function CreateUserForm({
  ideaOptions = [],
}: {
  ideaOptions?: IdeaOption[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'Jurado',
      avatarUrl: '',
      loginCode: '',
      rolOrganizacion: '',
      teamIdeaId: '',
    },
  });

  const selectedRole = form.watch('role');

  const generateRandomCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    form.setValue('loginCode', code);
  };

  const onSubmit = (data: CreateUserFormValues) => {
    startTransition(async () => {
      const result = await createUserAction(data);
      if (result.success) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
        form.reset();
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
             <CardTitle className="font-headline text-xl">Crear Nuevo Usuario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Maria López" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ej: m.lopez@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Avatar (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://ejemplo.com/imagen.png"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Jurado">Jurado</SelectItem>
                      <SelectItem value="Equipo">Equipo</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Organizer">Organizador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedRole === 'Equipo' && (
              <FormField
                control={form.control}
                name="teamIdeaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Iniciativa asignada *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona la iniciativa del equipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ideaOptions.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            No hay iniciativas creadas.
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {selectedRole === 'Jurado' && (
              <FormField
                control={form.control}
                name="rolOrganizacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Líder de Innovación, Director de TI"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="loginCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de Acceso (4 dígitos) *</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="1234"
                        inputMode="numeric"
                        maxLength={4}
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generateRandomCode}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crear Usuario
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
