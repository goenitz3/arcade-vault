# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — plataforma para jugar online y competir por puntaje. El repositorio está
en su estado inicial (scaffold de `create-next-app`); la mayor parte del producto todavía
no existe.

El flujo de trabajo esperado es **Spec Driven Design**: primero `/spec` para redactar la
especificación, luego `/spec-impl` para implementarla (skills de
`Klerith/fernando-skills`, instaladas con `npx skills@latest add Klerith/fernando-skills`).
Ante una petición de funcionalidad nueva, revisa si existe una spec antes de escribir código.

## Commands

```bash
npm run dev     # servidor de desarrollo
npm run build   # build de producción
npm run start   # sirve el build
npm run lint    # eslint (flat config)
npx tsc --noEmit  # chequeo de tipos; no hay script propio
```

No hay framework de tests configurado. Si se añade uno, documenta aquí cómo correr un test
individual.

## Stack y convenciones

- **Next.js 16.2.12 con App Router** (`app/`), React 19.2.4, TypeScript `strict`.
  Como indica AGENTS.md, esta versión de Next.js difiere de lo memorizado: consulta
  `node_modules/next/dist/docs/01-app/` (getting-started, guides, api-reference) antes de
  escribir código de routing, data fetching, caché, `params`/`searchParams` o Server Actions.
  Ignora `02-pages/` — este proyecto no usa el Pages Router.
- **Tailwind CSS v4** vía `@tailwindcss/postcss`. No hay `tailwind.config`: la
  configuración de tema vive en `app/globals.css` dentro de `@theme inline`, y los tokens
  (`--background`, `--foreground`, fuentes) se definen como variables CSS en `:root` con
  override en `prefers-color-scheme: dark`. Añade tokens ahí, no en un archivo de config.
- **Alias de imports**: `@/*` apunta a la raíz del proyecto (`tsconfig.json`).
- Las fuentes se cargan con `next/font/google` en `app/layout.tsx` y se exponen como
  variables CSS (`--font-geist-sans`, `--font-geist-mono`) consumidas por el tema de Tailwind.
