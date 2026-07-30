import { z } from 'zod';

export const FRENTE_VALUES = ['estrategia', 'impacto', 'innovacion', 'tecnico'] as const;
export type FrenteValue = (typeof FRENTE_VALUES)[number];

export const createUserFormSchema = z
  .object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
    email: z.string().email('Por favor, ingresa un correo electrónico válido.'),
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres.')
      .optional()
      .or(z.literal('')),
    role: z.enum(['Admin', 'Jurado', 'Organizer', 'Equipo'], {
      errorMap: () => ({ message: 'Por favor, selecciona un rol válido.' }),
    }),
    avatarUrl: z
      .string()
      .url('Por favor, ingresa una URL de imagen válida.')
      .optional()
      .or(z.literal('')),
    loginCode: z
      .string()
      .length(4, 'El código de acceso debe tener 4 dígitos.')
      .regex(/^\d{4}$/, 'El código solo puede contener números.'),
    frentesAEvaluar: z.array(z.enum(FRENTE_VALUES)).optional(),
    rolOrganizacion: z
      .string()
      .max(80, 'El cargo no puede superar 80 caracteres.')
      .optional()
      .or(z.literal('')),
    teamIdeaId: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => data.role !== 'Equipo' || (!!data.teamIdeaId && data.teamIdeaId !== ''),
    {
      message: 'Debes asignar una iniciativa al usuario Equipo.',
      path: ['teamIdeaId'],
    }
  );

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
