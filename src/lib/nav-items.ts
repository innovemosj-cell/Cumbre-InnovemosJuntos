import type { User } from '@/lib/types';

export const getNavItems = (user: User) => {
  const isAdmin = user.role === 'Admin';
  const isOrganizer = user.role === 'Organizer';
  const isJuror = user.role === 'Jurado';
  const isTeam = user.role === 'Equipo';

  if (isTeam) {
    return [
      {
        href: '/mi-iniciativa',
        label: 'Mi iniciativa',
        roles: ['Equipo'],
      },
    ];
  }

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      roles: ['Jurado', 'Admin', 'Organizer'],
    },
    ...(isJuror
      ? [
          {
            href: '/my-results',
            label: 'Mis Calificaciones',
            roles: ['Jurado'],
          },
        ]
      : []),
    ...(isOrganizer
      ? [
          {
            href: '/organizer',
            label: 'Resultados',
            roles: ['Organizer'],
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            href: '/admin/iniciativas',
            label: 'Iniciativas',
            roles: ['Admin'],
          },
          {
            href: '/admin/criterios',
            label: 'Criterios',
            roles: ['Admin'],
          },
          {
            href: '/admin/users',
            label: 'Usuarios',
            roles: ['Admin'],
          },
          {
            href: '/admin/votacion',
            label: 'Votación pública',
            roles: ['Admin'],
          },
        ]
      : []),
  ];

  return navItems.filter(item => item.roles.includes(user.role));
}
