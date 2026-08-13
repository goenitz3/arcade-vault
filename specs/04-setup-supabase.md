# SPEC 04 — Setup de Supabase

> **Estado:** Aprovado
> **Depende de:** 03-about-contact-form
> **Fecha:** 2026-08-13
> **Objetivo:** Instalar y configurar el SDK de Supabase (cliente browser y server) con sus variables de entorno, dejando el proyecto listo para implementar autenticación y base de datos en specs futuras.

## Alcance

**Dentro:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr` como dependencias del
  proyecto (`npm install`).
- Crear `lib/supabase/client.ts`: cliente Supabase para el navegador
  (`createBrowserClient`), para usarse en componentes `"use client"`.
- Crear `lib/supabase/server.ts`: cliente Supabase para el servidor
  (`createServerClient`), para usarse en Server Components y Route Handlers.
- Añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` a
  `.env.local.example` (sin valores) y a `.env.local` (no versionado, como
  placeholders vacíos que el desarrollador completa manualmente).

**Fuera de alcance (para specs futuras):**

- Cualquier flujo de autenticación real (login, registro, OAuth) en `/auth`.
  La sesión simulada en `localStorage` (`lib/session.tsx`) no se toca en
  esta spec.
- `middleware.ts` para refrescar la sesión de Supabase en cada request.
- Cualquier tabla o esquema de base de datos (`scores`, `games`, `profiles`).
- Supabase Realtime y Edge Functions.
- Tests automatizados.

## Modelo de datos

Esta spec no introduce entidades de dominio (no hay tablas ni tipos nuevos
en `lib/types.ts`). Solo define el contrato de configuración:

```ts
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

```ts
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
}
```

**Variables de entorno** (`.env.local`, no versionado):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Se agregan también a `.env.local.example` (sin valores), junto a
`RESEND_API_KEY` y `CONTACT_TO_EMAIL` ya existentes.

## Plan de implementación

Cada paso deja la aplicación compilando. Verificación con
`npx tsc --noEmit` y `npm run lint` en verde al cerrar cada paso.

1. **Dependencias.** Instalar `@supabase/supabase-js` y `@supabase/ssr`
   (`npm install @supabase/supabase-js @supabase/ssr`).
   Verificación: ambos paquetes aparecen en `package.json`.

2. **Variables de entorno.** Añadir `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sin valores) a `.env.local.example` y a
   `.env.local`, junto a las claves de Resend existentes.
   Verificación: ambas claves existen en los dos archivos;
   `.env.local` sigue sin versionarse (`git status` no lo muestra).

3. **Cliente browser.** Crear `lib/supabase/client.ts` con
   `createClient()` sobre `createBrowserClient`, según el modelo de datos.
   Verificación: `npx tsc --noEmit` no reporta errores; el módulo se puede
   importar desde un componente `"use client"` sin fallar en build.

4. **Cliente server.** Crear `lib/supabase/server.ts` con
   `createClient()` async sobre `createServerClient`, según el modelo de
   datos.
   Verificación: `npx tsc --noEmit` no reporta errores; el módulo se puede
   importar desde un Server Component sin fallar en build.

## Criterios de aceptación

- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen en las
      `dependencies` de `package.json`.
- [ ] `npm run build` termina sin errores y `npx tsc --noEmit` no reporta nada.
- [ ] `npm run lint` pasa sin errores ni advertencias.
- [ ] `lib/supabase/client.ts` existe y exporta una función que crea un
      cliente Supabase con `createBrowserClient`.
- [ ] `lib/supabase/server.ts` existe y exporta una función que crea un
      cliente Supabase con `createServerClient`, leyendo cookies de
      `next/headers`.
- [ ] `.env.local.example` incluye `NEXT_PUBLIC_SUPABASE_URL` y
      `NEXT_PUBLIC_SUPABASE_ANON_KEY` sin valores, junto a las claves de
      Resend ya existentes.
- [ ] `.env.local` incluye las mismas dos claves (con o sin valor real,
      según lo que el desarrollador complete) y no aparece en `git status`.
- [ ] No se modificó `lib/session.tsx`, `app/auth/page.tsx` ni ninguna
      pantalla existente.

## Decisiones tomadas y descartadas

### Alcance

- **Sí:** limitar esta spec a instalación de paquetes + clientes + env vars,
  separándola de autenticación (spec futura) y base de datos (spec futura).
  Decisión explícita del usuario: "implementar Supabase" tocaba demasiadas
  áreas (auth, 3 tablas, migración de catálogo) para una sola spec.
- **No:** incluir `middleware.ts` en esta spec. Solo tiene sentido una vez
  que exista un flujo de auth real que lo necesite; agregarlo ahora sería
  código sin consumidor.
- **No:** tocar `lib/session.tsx` ni `/auth` todavía. La sesión simulada en
  `localStorage` sigue funcionando igual hasta la spec de autenticación.

### Paquetes y clientes

- **Sí:** `@supabase/ssr` (no solo `@supabase/supabase-js`) porque Next.js
  16 App Router necesita manejo de cookies para sesiones SSR; es el paquete
  oficial de Supabase para este patrón.
- **Sí:** dos archivos separados (`client.ts` / `server.ts`) en
  `lib/supabase/`, siguiendo el patrón oficial de Supabase para App Router
  (cliente de navegador vs. cliente de servidor no son intercambiables).

### Variables de entorno

- **Sí:** reusar `.env.local.example` (creado en spec 03) en vez de crear
  `.env.template`. Mantiene una sola convención de plantilla de env vars en
  el repo.
- **Sí:** valores vacíos como placeholder; el desarrollador completa
  manualmente las credenciales de su proyecto Supabase, igual que se hizo
  con `RESEND_API_KEY` en spec 03.
