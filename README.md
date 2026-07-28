# KuriDoIt

PWA interna de predicciones para partidos de Kuriyama. Cada partido contiene preguntas opcionales con respuesta Sí/No y un valor fijo: acertar suma el valor y fallar resta exactamente el mismo valor. Incluye panel administrativo, ranking desplegable, API sobre Cloudflare Pages Functions y persistencia D1.

## Arquitectura

- `src/`: React + TypeScript + Vite + Tailwind, mobile-first.
- `functions/api/[[path]].ts`: API REST de Pages Functions, validación Zod y autenticación admin por cookie HMAC.
- `migrations/`: esquema D1 versionado.
- `public/` y configuración `vite-plugin-pwa`: manifest, icono, service worker y caché segura de lectura pública.
- `wrangler.jsonc`: Pages y binding D1 obligatorio `DB`.

Las predicciones siempre validan en servidor el usuario, partido, pregunta y cierre. Cada usuario puede responder cualquier subconjunto de preguntas y modificar su respuesta mientras siga abierto el partido. `UNIQUE(user_id, question_id)` evita duplicados concurrentes. Las respuestas de terceros solo se exponen desde 30 minutos antes del inicio; la respuesta propia permanece visible.

## Instalación y desarrollo

```bash
npm install
npm run dev
```

Para probar frontend y Functions juntos:

```bash
npm run build
npx wrangler d1 create kuridoit-db
# Sustituir REPLACE_WITH_D1_DATABASE_ID en wrangler.jsonc
npx wrangler d1 migrations apply kuridoit-db --local
npm run pages:dev
```

Comandos de calidad: `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build`.

## Secretos requeridos

No se guardan en Git. Configurarlos en Cloudflare Pages (producción y preview cuando corresponda):

- `ADMIN_PASSWORD_HASH`: hash bcrypt de la contraseña administrativa.
- `SESSION_SECRET`: cadena aleatoria larga (mínimo recomendado: 32 bytes).

El acceso está disponible en `/admin/login`. Configura ambos valores con `npx wrangler pages secret put ADMIN_PASSWORD_HASH --project-name kuridoit` y `npx wrangler pages secret put SESSION_SECRET --project-name kuridoit`; Wrangler solicitará cada valor sin guardarlo en el repositorio.

Ejemplo local en `.dev.vars` (archivo ignorado):

```dotenv
ADMIN_PASSWORD_HASH=$2b$12$...
SESSION_SECRET=una-cadena-aleatoria-larga
```

Se puede generar el hash con `npx wrangler secret`/una herramienta bcrypt confiable. Nunca usar la contraseña en texto plano.

## D1 y migraciones

Las migraciones crean el esquema legado y las tablas actuales `questions` y `predictions`, con claves foráneas, checks, índices y restricciones únicas. Para producción:

```bash
npx wrangler d1 migrations apply kuridoit-db --remote
```

No ejecutar hasta crear la base, colocar su ID real y revisar el destino. Toda evolución del esquema debe agregarse en una migración nueva.

## API

Pública/usuario: `POST /api/users`, `GET /api/matches/open`, `GET /api/questions/:matchId`, `POST /api/predictions`, `GET /api/users/:id/predictions` y `GET /api/leaderboard`.

Administración: `/admin` y `/admin/questions` abren la misma consola de partidos, preguntas, predicciones y moderación. El CRUD de `/api/admin/questions` administra preguntas; `POST /api/admin/questions/settle` asigna puntos, y `DELETE /api/admin/predictions/:id` elimina una predicción registrada por error. Todas las rutas administrativas verifican la cookie firmada en servidor.

## Despliegue en Cloudflare Pages

- Rama de producción: `main`
- Comando: `npm run build`
- Directorio de salida: `dist`
- Binding D1: `DB`

Crear el proyecto/base en Cloudflare, configurar el `database_id`, el binding y los dos secretos; aplicar migraciones antes del primer uso. Cada push a `main` será construido por Pages.
