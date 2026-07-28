# KuriDoIt — reglas del repositorio

- Mantener una PWA mobile-first con React, TypeScript, Vite y Tailwind.
- El backend vive en Cloudflare Pages Functions (TypeScript) y usa exclusivamente D1 mediante el binding `DB`.
- Todo cambio de esquema requiere una migración SQL nueva en `migrations/`; nunca editar migraciones aplicadas ni ejecutar cambios destructivos sin autorización.
- Validar entradas, usar consultas preparadas, comprobar cierres en servidor, congelar `odds_snapshot` y proteger todas las rutas admin con sesión HttpOnly.
- Nunca versionar `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` ni IDs/credenciales reales.
- Antes de entregar: ejecutar lint, typecheck, tests y build. Solo hacer commit/push si pasan y no hay secretos ni riesgos de datos.
- Producción usa `main`, build `npm run build`, output `dist`; desarrollo local mediante Wrangler.
