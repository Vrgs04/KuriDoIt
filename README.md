# Kuriyama Picks

PWA interna para que empleados hagan un pick por partido, acumulen puntos según el momio decimal congelado y compitan en un ranking. Incluye panel administrativo, API real sobre Cloudflare Pages Functions y persistencia Cloudflare D1.

## Arquitectura

- `src/`: React + TypeScript + Vite + Tailwind, mobile-first.
- `functions/api/[[path]].ts`: API REST de Pages Functions, validación Zod y autenticación admin por cookie HMAC.
- `migrations/`: esquema D1 versionado.
- `public/` y configuración `vite-plugin-pwa`: manifest, icono, service worker y caché segura de lectura pública.
- `wrangler.jsonc`: Pages y binding D1 obligatorio `DB`.

Los picks siempre consultan en servidor el partido, mercado y opción; se valida el cierre y se copia el momio vigente a `odds_snapshot`. La restricción `UNIQUE(user_id, match_id)` evita duplicados concurrentes. El leaderboard se calcula desde los picks resueltos y desempata por victorias y momio ganador promedio.

## Instalación y desarrollo

```bash
npm install
npm run dev
```

Para probar frontend y Functions juntos:

```bash
npm run build
npx wrangler d1 create kuriyama-picks
# Sustituir REPLACE_WITH_D1_DATABASE_ID en wrangler.jsonc
npx wrangler d1 migrations apply kuriyama-picks --local
npm run pages:dev
```

Comandos de calidad: `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build`.

## Secretos requeridos

No se guardan en Git. Configurarlos en Cloudflare Pages (producción y preview cuando corresponda):

- `ADMIN_PASSWORD_HASH`: hash bcrypt de la contraseña administrativa.
- `SESSION_SECRET`: cadena aleatoria larga (mínimo recomendado: 32 bytes).

Ejemplo local en `.dev.vars` (archivo ignorado):

```dotenv
ADMIN_PASSWORD_HASH=$2b$12$...
SESSION_SECRET=una-cadena-aleatoria-larga
```

Se puede generar el hash con `npx wrangler secret`/una herramienta bcrypt confiable. Nunca usar la contraseña en texto plano.

## D1 y migraciones

La migración `0001_initial.sql` crea `users`, `matches`, `markets`, `market_options` y `picks`, con claves foráneas, checks, índices y restricciones únicas. Para producción:

```bash
npx wrangler d1 migrations apply kuriyama-picks --remote
```

No ejecutar hasta crear la base, colocar su ID real y revisar el destino. Toda evolución del esquema debe agregarse en una migración nueva.

## API

Pública/usuario: `POST /api/users`, `GET /api/matches/current`, `GET /api/matches`, `GET /api/markets/:matchId`, `POST /api/picks`, `GET /api/users/:id/picks`, `GET /api/leaderboard`.

Administración: `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/dashboard`, CRUD de escritura para `/api/admin/matches`, `/api/admin/markets`, `/api/admin/options`, `POST /api/admin/settle` y `GET /api/admin/picks` con filtros `user`, `match`, `market`, `status`. Todas las rutas administrativas (excepto login/logout) verifican la cookie firmada en servidor.

## Despliegue en Cloudflare Pages

- Rama de producción: `main`
- Comando: `npm run build`
- Directorio de salida: `dist`
- Binding D1: `DB`

Crear el proyecto/base en Cloudflare, configurar el `database_id`, el binding y los dos secretos; aplicar migraciones antes del primer uso. Cada push a `main` será construido por Pages.
