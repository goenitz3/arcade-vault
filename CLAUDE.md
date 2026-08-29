# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Skills

- Usa siempre `/frontend-design` para diseñar interfaces de usuario.
- `/spec` y `/spec-impl` (pack `Klerith/fernando-skills`): flujo general Spec Driven Design —
  primero la especificación, luego la implementación.
- `/juego-nuevo <carpeta-en-references/started-games>` y `/juego-nuevo-impl`
  (skills propias del repo, en `.claude/skills/`): variantes especializadas para portar un
  juego de `references/started-games/` con motor de canvas + leaderboard en Supabase.
  La implementación crea la rama `spec-NN-slug` y avanza por pasos con pausas de revisión.

Ante una petición de funcionalidad nueva, revisa si existe una spec en `specs/` antes de
escribir código. Para juegos nuevos, prefiere `/juego-nuevo` sobre `/spec`.

## Project

Arcade Vault — plataforma para jugar online y competir por puntaje. Hay 9 specs en `specs/`
(el estado vive dentro de cada archivo); 4 juegos ya son jugables con motor propio.

**Rutas** (App Router, UI en español):

- `/` — landing (`app/page.tsx`, Server Component).
- `/games` — biblioteca/catálogo(see `references/implemented-games.md`).
- `/juegos/[id]` — detalle + leaderboard; `/juegos/[id]/jugar` — reproductor.
- `/salon` — salón de la fama; `/auth` — login simulado; `/about` — acerca de + contacto.
- `app/api/contact/route.ts` — POST que envía correo real vía Resend.

**Juegos**: con motor real `asteroids`, `tetris`, `arkanoid`, `snake`
(lista en `lib/games-with-engine.ts`); sin motor aún (datos simulados) `gloton`,
`invasores`, `ranaria`, `duelo-pixel`.

## Arquitectura de juegos

Cada juego vive en `components/games/<slug>/` con dos piezas:

- `engine.ts` — lógica pura de canvas, sin React. Exporta `createEngine(canvas)` con el
  contrato uniforme `start()`, `pause()`, `resume()`, `forceGameOver()`, `destroy()`,
  `onChange(cb)` (devuelve unsubscribe) y un tipo `EngineSnapshot`
  (`score`, `level`, `state: "playing" | "gameover" | "win"`, más campos propios).
- `<Nombre>Game.tsx` — componente `"use client"` con firma `({ game }: { game: Game })`.
  Crea el motor en `useEffect`, suscribe `onChange` a estado React, y renderiza HUD,
  overlays y modales en React (nunca en canvas). Guarda puntuaciones con `saveScore()`
  de `lib/scores-supabase.ts`.

Registro doble (no unificar: evita importar componentes cliente en RSC):

- `components/games/engine-registry.tsx` — mapa `ENGINE_COMPONENTS` (lado cliente).
- `lib/games-with-engine.ts` — `GAMES_WITH_ENGINE` (lado server).

Checklist para añadir un juego: migración SQL en `supabase/migrations/` →
`engine.ts` + `Game.tsx` → registrar en ambos archivos → clase `.cover-<slug>` en
`app/globals.css`. La skill `/juego-nuevo` cubre este flujo completo.

## Supabase y datos

- Tablas `games` y `scores` (migraciones en `supabase/migrations/`). RLS: SELECT público
  en ambas; INSERT público solo en `scores`; sin UPDATE/DELETE.
- **Lectura solo en server**: `lib/games.ts` (`getGames`/`getGame`) y
  `lib/scores-supabase-server.ts` (`topScores`). **Escritura solo en cliente**:
  `lib/scores-supabase.ts` (`saveScore`). Clientes en `lib/supabase/{client,server}.ts`.
- Juegos sin motor usan rankings simulados **deterministas** en `lib/scores.ts` — nada de
  `Date.now()` ni `Math.random()` (evita desajustes de hidratación).
- Sesión simulada en `lib/session.tsx`: `localStorage` + `useSyncExternalStore`
  (el lint prohíbe `setState` síncrono en `useEffect`).
- Variables de entorno documentadas en `.env.local.example`. El MCP de Supabase está
  declarado en `.mcp.json`.

## Stack y convenciones

- **Next.js 16.2.12 con App Router** (`app/`), React 19.2.4, TypeScript `strict`.
  Como indica AGENTS.md, esta versión de Next.js difiere de lo memorizado: consulta
  `node_modules/next/dist/docs/01-app/` (getting-started, guides, api-reference) antes de
  escribir código de routing, data fetching, caché, `params`/`searchParams` o Server Actions.
  Ignora `02-pages/` — este proyecto no usa el Pages Router.
- Tipos de página con el helper global `PageProps<"/juegos/[id]">` y `params` con `await`
  (ver `app/juegos/[id]/page.tsx`).
- **Tailwind CSS v4** vía `@tailwindcss/postcss`. No hay `tailwind.config`: el tema vive en
  `app/globals.css` dentro de `@theme inline`, con tokens como variables CSS en `:root` y
  override en `prefers-color-scheme: dark`. Añade tokens ahí, no en un archivo de config.
- Fuentes con `next/font/google` en `app/layout.tsx`: `Press_Start_2P`, `JetBrains_Mono` y
  `Courier_Prime`, expuestas como `--font-press-start`, `--font-jetbrains-mono` y
  `--font-courier-prime`.
- **Alias de imports**: `@/*` apunta a la raíz del proyecto (`tsconfig.json`).
- Formateo: Prettier (`.prettierrc.json`) aplicado automáticamente por el hook `PostToolUse`
  de `.claude/settings.json` (`.claude/hooks/format-file.mjs`). `references/` está excluido
  de ESLint y Prettier — no lo toques ni lo formatees.
- Git: commits `SpecNNPMM:Descripción` (uno por paso de la spec), rama `spec-NN-slug`,
  merge por PR.
- No hay framework de tests. La verificación es visual con el MCP de Playwright
  (capturas en `.playwright-screenshots/`). Si se añade un framework, documenta aquí cómo
  correr un test individual.
