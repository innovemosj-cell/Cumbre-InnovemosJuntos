# CalificApp — Innovemos Juntos

Plataforma web para clasificar y priorizar iniciativas de IA en Comfama. Permite a jurados evaluar propuestas siguiendo una matriz de criterios por frentes, y a los organizadores ver resultados ponderados y la matriz de priorización.

## Roles

| Rol | Qué puede hacer |
|---|---|
| **Jurado** | Ve solo las iniciativas activas que le corresponden, califica según los criterios de los frentes que tiene asignados, consulta su histórico en *Mis Calificaciones*. |
| **Organizer** | Ve el ranking ponderado de todas las iniciativas evaluadas, descarga CSVs (resumen + detalle por jurado), revisa la *Matriz de Priorización* (Impacto vs Facilidad). |
| **Admin** | Gestiona el catálogo completo: usuarios (códigos de login y frentes asignados), iniciativas (CRUD + activar/desactivar), y los criterios de evaluación (CRUD completo: pesos, niveles y frente). |

## Modelo de evaluación

Cada iniciativa se califica por **4 frentes**, cada uno con peso configurable (default 30/25/15/30):

- **Estrategia** (30%)
- **Impacto** (25%)
- **Innovación** (15%)
- **Técnico** (30%)

Cada frente contiene varios **criterios** (11 en total al sembrar la base). Cada criterio tiene su propio peso interno y entre 2 y 7 niveles con descripciones (score 1–5). El puntaje final de una iniciativa = promedio ponderado de los frentes calificados por los jurados que tenían ese frente asignado.

Los criterios y pesos se editan en `/admin/criterios` sin tocar código.

## Autenticación

Login por **código de 4 dígitos** asignado por el Admin a cada usuario. La sesión se persiste en una cookie JWT firmada (`jose`, HS256, 1 día de vida). No usa Firebase Auth en el front.

## Stack

- **Next.js 15** (App Router, Turbopack, Server Actions)
- **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Radix)
- **Firestore** vía cliente REST propio (compatible con Cloudflare Workers — sin SDK de Node)
- **jose** para firmar/verificar JWT de sesión
- **Recharts** para la matriz de priorización
- **Zod** + **React Hook Form** para validación de formularios
- **xlsx** para parsear pegado masivo (cuando aplica)
- **OpenNext** para despliegue en Cloudflare Workers

## Estructura

```
src/
├── app/
│   ├── (app)/                  # rutas protegidas (requieren sesión)
│   │   ├── dashboard/          # listado de iniciativas (con secciones Activas/Inactivas para Admin)
│   │   ├── ideas/[id]/         # detalle + formulario de evaluación
│   │   ├── my-results/         # histórico del jurado
│   │   ├── organizer/          # resultados + matriz de priorización
│   │   └── admin/
│   │       ├── iniciativas/    # CRUD de iniciativas
│   │       ├── criterios/      # CRUD de criterios y pesos
│   │       └── users/          # gestión de usuarios y frentes asignados
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── admin/                  # editores: frentes, criterios, iniciativas, usuarios
│   ├── ideas/                  # cards + formulario de evaluación
│   ├── juror/                  # tabla de resultados del jurado
│   ├── organizer/              # dashboard, matriz, CSV
│   ├── layout/                 # header, navs, user menu
│   └── ui/                     # primitives shadcn (solo los que usamos)
├── lib/
│   ├── actions.ts              # server actions (login, ratings, CRUD)
│   ├── data.ts                 # capa de datos (Firestore)
│   ├── firestore-rest.ts       # cliente REST de Firestore
│   ├── session.ts              # JWT con jose
│   ├── criteria-data.ts        # seed inicial de criterios y frentes
│   └── types.ts
└── scripts/
    └── seed-hackathon.ts       # siembra inicial de iniciativas/usuarios
```

## Variables de entorno

`.env` (no se versiona) — requiere:

```
SESSION_SECRET=<string fuerte>
FIREBASE_PROJECT_ID=<...>
FIREBASE_SERVICE_ACCOUNT=<JSON del service account, en una sola línea>
```

Para deploy en Cloudflare:

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
```

## Scripts

```bash
npm run dev         # arranca dev server en http://localhost:9002 (Turbopack)
npm run build       # build de producción de Next
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run seed        # siembra Firestore con datos iniciales
npm run preview     # build + preview con OpenNext en Workers local
npm run deploy      # build + deploy a Cloudflare Workers
npm run cf-typegen  # regenera tipos de bindings de Cloudflare
```

## Primeros pasos

1. Copia `.env.example` (si existe) a `.env` y completa las variables.
2. Instala dependencias: `npm install`
3. Siembra Firestore: `npm run seed`
4. Arranca: `npm run dev`
5. Visita `http://localhost:9002` — te redirige a `/login`.

## Despliegue

El proyecto está configurado para desplegar a Cloudflare Workers vía OpenNext:

```bash
npm run deploy
```

Tras el primer deploy, agrega el dominio de Cloudflare a los **Authorized Domains** de Firebase Auth si vas a usar el SDK desde el cliente (no necesario para el flujo actual de código de 4 dígitos).

## Seguridad

- `.env` y `firebase-service-account*.json` están en `.gitignore`. **Nunca** los commitees.
- `SESSION_SECRET` debe ser una cadena fuerte y única por entorno.
- Si las credenciales del service account se exponen, **rótalas inmediatamente** en Google Cloud Console.

## Estado

- TypeScript compila sin errores (`npx tsc --noEmit`).
- Dependencias auditadas y depuradas: sin Genkit/AI residual, sin primitives shadcn no usados, sin código muerto de flujos viejos (settings de pesos, login por email/password, upload masivo por IA).
