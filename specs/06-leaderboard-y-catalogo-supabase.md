# SPEC 06 — Leaderboard y catálogo de juegos en Supabase

> **Estado:** Implementado
> **Depende de:** 04-setup-supabase, 05-asteroids-game
> **Fecha:** 2026-08-19
> **Objetivo:** Migrar el catálogo de juegos (`lib/games.ts`) a una tabla `games` de solo lectura en Supabase y persistir las puntuaciones reales de Asteroids en una tabla `scores` de Supabase, reemplazando el array hardcodeado y el `localStorage` (`av_scores`) para ese juego mientras los otros 7 juegos siguen usando datos simulados como hoy.

## Alcance

**Dentro:**

- Tabla `games` en Supabase (solo lectura desde la app): mismos campos que
  el tipo `Game` (`id`, `title`, `short`, `long`, `cat`, `cover`, `color`,
  `best`, `plays`), sembrada con los 8 juegos actuales de `lib/games.ts`
  tal cual (incluyendo `best`/`plays` como valores estáticos).
- Tabla `scores` en Supabase: `id`, `game_id` (FK a `games.id`),
  `player_name`, `score`, `created_at`. Lectura pública; escritura pública
  (INSERT anónimo), sin auth real.
- Migración SQL versionada en `supabase/migrations/`, con `CREATE TABLE`,
  políticas RLS (SELECT público en ambas tablas; INSERT público solo en
  `scores`) y el `INSERT` semilla de los 8 juegos.
- `lib/games.ts` deja de exportar `GAMES` como array hardcodeado; se
  convierte en funciones que consultan Supabase (`getGames()`, `getGame(id)`
  async). `CATS` (lista estática de categorías) se queda como está.
- Todas las páginas/componentes server que hoy importan `GAMES`
  síncronamente (`app/page.tsx`, `app/games/page.tsx`,
  `app/juegos/[id]/page.tsx`, `app/juegos/[id]/jugar/page.tsx`) pasan a
  `await getGames()`/`await getGame(id)`.
- `app/salon/page.tsx` se divide en un `page.tsx` server (fetch de
  `getGames()`) y un componente cliente que recibe `games` por props, igual
  patrón que `GameBrowser`.
- `useSession().saveScore` gana un camino separado para Asteroids: en vez
  de escribir en `localStorage`, `AsteroidsGame.tsx` inserta directamente en
  la tabla `scores` de Supabase (vía un nuevo helper, p.ej.
  `lib/scores-supabase.ts`).
- `/salon` (pestaña Asteroids) y el panel `Leaderboard` en
  `/juegos/asteroids` leen el top real de la tabla `scores` filtrando por
  `game_id = "asteroids"`. Si no hay filas, se muestra un estado vacío
  ("Aún sin puntuaciones. Sé el primero en aparecer aquí.") en vez de datos
  simulados.
- Los otros 7 juegos siguen mostrando `seededScores` (`lib/scores.ts`) sin
  cambios en `/salon` y en sus paneles de detalle.

**Fuera de alcance (para specs futuras):**

- Autenticación real de Supabase / vincular `scores` a un `user_id`. Se
  sigue usando el nombre de la sesión simulada (`localStorage av_user`)
  como `player_name`, texto libre.
- Calcular `game.best`/`game.plays` desde datos reales de `scores`; quedan
  como columnas estáticas migradas tal cual.
- Que los otros 7 juegos (`GamePlayer.tsx`) escriban puntuaciones reales en
  Supabase: siguen guardando en `localStorage` (`av_scores`) exactamente
  como hoy.
- ISR/cache avanzado o `generateStaticParams` basado en datos reales de
  Supabase (los params estáticos se generan igual, solo cambia la fuente
  del array de ids).
- Panel de administración o cualquier UI para editar `games` o borrar
  `scores`.
- Tests automatizados.

## Modelo de datos

### Tabla `games` (Postgres/Supabase)

```sql
create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  best integer not null,
  plays text not null
);

alter table public.games enable row level security;

create policy "games_public_read" on public.games
  for select using (true);
-- Sin políticas de insert/update/delete: solo lectura desde el cliente.
```

### Tabla `scores`

```sql
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  player_name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

create policy "scores_public_read" on public.scores
  for select using (true);

create policy "scores_public_insert" on public.scores
  for insert with check (true);
-- Sin update/delete: las puntuaciones son inmutables una vez guardadas.
```

### Tipos TypeScript (`lib/types.ts`)

No se agregan campos nuevos a `Game` ni `SavedScore`. Se añade un tipo para
las filas de Supabase que ya coincide 1:1 con lo anterior:

```ts
export type ScoreRecord = {
  id: string;
  game_id: string;
  player_name: string;
  score: number;
  created_at: string;
};
```

### `lib/games.ts` (nuevo contrato)

```ts
export async function getGames(): Promise<Game[]> { /* select * from games */ }
export async function getGame(id: string): Promise<Game | undefined> { /* select * from games where id = :id */ }
export const CATS = [...] as const; // sin cambios, no depende de Supabase
```

### `lib/scores-supabase.ts` (nuevo)

```ts
export async function saveAsteroidsScore(entry: { playerName: string; score: number }): Promise<void>;
export async function topAsteroidsScores(limit: number): Promise<ScoreRow[]>; // mapea ScoreRecord -> ScoreRow (rank, name, score, date) para reusar <Leaderboard>
```

- La migración semilla en SQL inserta los 8 juegos actuales de
  `lib/games.ts` con sus mismos valores (`best`/`plays` incluidos).
- `saveAsteroidsScore` usa el cliente Supabase de navegador
  (`lib/supabase/client.ts`, ya existe desde spec 04).
- `getGames`/`getGame`/`topAsteroidsScores` usan el cliente de servidor
  (`lib/supabase/server.ts`) cuando se llaman desde Server Components.

## Plan de implementación

Cada paso deja la aplicación compilando y navegable. Verificación con
`npx tsc --noEmit` y `npm run lint` en verde al cerrar cada paso.

1. **Migración SQL.** Crear `supabase/migrations/0001_games_and_scores.sql`
   con las tablas `games` y `scores`, sus políticas RLS y el `INSERT`
   semilla de los 8 juegos actuales de `lib/games.ts`. Aplicarla al
   proyecto Supabase configurado en spec 04 (SQL editor o `supabase db
   push`).
   Verificación: `select * from games` devuelve 8 filas idénticas a
   `lib/games.ts`; `select * from scores` devuelve 0 filas; intentar un
   `insert into games` desde el rol anónimo falla por RLS.

2. **`lib/games.ts` async sobre Supabase.** Reemplazar el array `GAMES`
   hardcodeado por `getGames()`/`getGame(id)` que consultan la tabla
   `games` vía `lib/supabase/server.ts`. Mantener `CATS` igual.
   Verificación: `npx tsc --noEmit` sin errores (aún no hay consumidores
   actualizados, este paso solo cambia el módulo).

3. **Actualizar consumidores server de `GAMES`/`getGame`.**
   `app/page.tsx`, `app/games/page.tsx`, `app/juegos/[id]/page.tsx` y
   `app/juegos/[id]/jugar/page.tsx` pasan a `await getGames()`/
   `await getGame(id)` (incluyendo `generateStaticParams` y
   `generateMetadata`, que ya soportan async).
   Verificación: `/`, `/games`, `/juegos/<id>` y `/juegos/<id>/jugar`
   cargan igual que antes para los 8 juegos, con los mismos datos.

4. **Dividir `app/salon/page.tsx`.** Convertir en un server component que
   hace `await getGames()` y renderiza un nuevo componente cliente
   (`components/SalonHallOfFame.tsx`) que recibe `games` por props y
   conserva toda la lógica de pestañas/podio actual.
   Verificación: `/salon` se ve y funciona igual que antes (pestañas,
   podio, tabla) para los 7 juegos que siguen con `seededScores`.

5. **`lib/scores-supabase.ts`.** Crear `saveAsteroidsScore` (INSERT en
   `scores` vía cliente browser) y `topAsteroidsScores(limit)` (SELECT
   ordenado por `score desc`, mapeado a `ScoreRow[]`).
   Verificación: `npx tsc --noEmit` sin errores; probado de forma aislada,
   `saveAsteroidsScore` inserta una fila visible en Supabase.

6. **`AsteroidsGame.tsx` usa Supabase.** Reemplazar la llamada a
   `useSession().saveScore(...)` por `saveAsteroidsScore({ playerName: name,
   score })` al guardar puntuación en el modal de fin de juego.
   Verificación: jugar una partida de Asteroids, guardar puntuación, y
   confirmar en Supabase que aparece la fila; `av_scores` en `localStorage`
   ya no recibe entradas de Asteroids.

7. **Leaderboard real de Asteroids en `/salon` y en el detalle.** En
   `SalonHallOfFame.tsx`, cuando la pestaña activa es `asteroids`, usar
   `topAsteroidsScores(12)` en vez de `seededScores`; si no hay filas,
   mostrar el estado vacío ("Aún sin puntuaciones..."). En
   `app/juegos/[id]/page.tsx`, cuando `id === "asteroids"`, usar
   `topAsteroidsScores(10)` en vez de `detailScores`.
   Verificación: tras guardar una puntuación real de Asteroids (paso 6),
   aparece en `/salon` (pestaña Asteroids) y en `/juegos/asteroids` con el
   nombre y puntaje correctos; los otros 7 juegos siguen mostrando datos
   simulados sin cambios.

## Criterios de aceptación

### General

- [ ] `npm run build` termina sin errores y `npx tsc --noEmit` no reporta nada.
- [ ] `npm run lint` pasa sin errores ni advertencias.
- [ ] `lib/games.ts` no exporta un array `GAMES` hardcodeado; `getGames()`
      y `getGame(id)` consultan Supabase.

### Tabla `games`

- [ ] `supabase/migrations/0001_games_and_scores.sql` existe, versionado en
      el repo, y crea las tablas `games`/`scores` con RLS y semilla de los
      8 juegos.
- [ ] `select * from games` en el proyecto Supabase devuelve exactamente
      los 8 juegos con los mismos datos que tenía `lib/games.ts`.
- [ ] Un `insert`/`update`/`delete` sobre `games` con el rol anónimo falla
      por política RLS (solo lectura).
- [ ] `/`, `/games`, `/juegos/[id]` y `/juegos/[id]/jugar` cargan y
      muestran los 8 juegos igual que antes de la migración.

### Tabla `scores` y Asteroids

- [ ] Guardar una puntuación en `/juegos/asteroids/jugar` inserta una fila
      real en la tabla `scores` de Supabase (`game_id: "asteroids"`), no en
      `localStorage`.
- [ ] Esa puntuación aparece en `/salon` (pestaña ASTEROIDS) y en el panel
      `Leaderboard` de `/juegos/asteroids`, ordenada de mayor a menor junto
      con las demás puntuaciones reales guardadas.
- [ ] Antes de guardar ninguna puntuación (tabla `scores` vacía para
      `asteroids`), `/salon` (pestaña ASTEROIDS) y `/juegos/asteroids`
      muestran el estado "Aún sin puntuaciones" en vez de datos simulados
      o un error.
- [ ] Un `insert` en `scores` con el rol anónimo funciona (INSERT público);
      un `update`/`delete` sobre `scores` falla por RLS.

### Aislamiento de los otros 7 juegos

- [ ] `/salon` y los paneles de detalle de los 7 juegos restantes (no
      Asteroids) siguen mostrando `seededScores` exactamente como antes,
      sin ninguna fila de la tabla `scores` real mezclada.
- [ ] Guardar puntuación en cualquiera de los 7 juegos (`GamePlayer.tsx`)
      sigue escribiendo únicamente en `localStorage` (`av_scores`), sin
      insertar nada en Supabase.

## Decisiones tomadas y descartadas

### Alcance general

- **Sí:** una sola spec cubriendo `games` (solo lectura) y `scores`
  (lectura+escritura para Asteroids). Decisión explícita del usuario:
  aunque son dominios distintos, el alcance reducido de cada uno
  (`games` sin escritura, `scores` solo para un juego) los mantiene
  manejables juntos.
- **No:** conectar `game.best`/`game.plays` a agregados reales de
  `scores`. Se migran como columnas estáticas; calcularlos en tiempo real
  requeriría queries agregados y decisiones de cacheo fuera del alcance
  pedido.
- **No:** que los 7 juegos restantes escriban puntuaciones reales en
  Supabase. Decisión explícita del usuario: solo Asteroids, que ya tiene
  un motor real (spec 05); los demás siguen con puntaje simulado en
  `GamePlayer.tsx`, mezclarlos con datos reales sería inconsistente.

### Persistencia y migraciones

- **Sí:** archivo SQL versionado en `supabase/migrations/` en vez de
  aplicar cambios solo vía MCP sin dejar rastro en el repo. Decisión
  explícita del usuario: mantiene el schema reproducible y auditable en
  git, consistente con el resto del proyecto versionado.
- **Sí:** RLS con lectura pública en ambas tablas y escritura pública solo
  en `scores` (INSERT anónimo). Decisión explícita del usuario: no hay
  auth real todavía (fuera de alcance, ver spec 04), así que cualquier
  visitante debe poder guardar su puntuación igual que hoy con
  `localStorage`; `games` en cambio no tiene ningún flujo que la escriba
  desde el cliente.
- **No:** vincular `scores` a un `user_id` de Supabase Auth. Requeriría
  implementar autenticación real primero, explícitamente diferido desde
  spec 04.

### Identidad del jugador

- **Sí:** `player_name` como texto libre (mismo `normalizeName` ya usado
  en `lib/session.tsx`: mayúsculas, máx. 10 caracteres), sin relación a
  usuarios reales. Consistente con que la sesión sigue siendo simulada.

### Arquitectura de datos en componentes

- **Sí:** dividir `app/salon/page.tsx` en server (`getGames()`) + cliente
  (`SalonHallOfFame.tsx` recibiendo `games` por props), replicando el
  patrón ya usado por `GameBrowser`/`app/games/page.tsx`. Es la única forma
  de mantener el fetch de Supabase en el servidor sin convertir toda la
  página a client-side data fetching.
- **No:** hacer fetch de Supabase directamente desde componentes cliente
  para leer `games`. Se preserva el patrón server-fetch + props ya
  establecido en el proyecto, evitando duplicar lógica de cliente Supabase
  en múltiples componentes.

### Estado vacío del leaderboard real

- **Sí:** mostrar "Aún sin puntuaciones" en vez de rellenar con
  `seededScores` cuando la tabla `scores` está vacía para Asteroids.
  Decisión explícita del usuario: evita mezclar datos reales y simulados
  bajo la misma tabla, lo que confundiría a cualquiera que revise
  `scores` directamente en Supabase esperando que refleje solo partidas
  reales.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| RLS de `scores` permite INSERT público sin ninguna validación de contenido: cualquiera puede escribir un `score` arbitrariamente alto o un `player_name` con contenido no deseado. | Aceptado por ahora: es el mismo nivel de confianza que ya existe hoy con `localStorage` (nadie valida esos datos tampoco). Se documenta como riesgo conocido, no se agrega validación adicional en el servidor en esta spec. |
| Convertir `getGames()`/`getGame()` en funciones async introduce una dependencia de red en páginas que antes eran síncronas (`generateStaticParams`, landing). Si Supabase no responde, el build o el render fallarían donde antes nunca fallaban. | Mitigado por diseño: Next.js ya soporta `generateStaticParams`/Server Components async de forma nativa; no se requiere manejo de error especial más allá de que la build falle visiblemente si Supabase está inaccesible, igual que fallaría cualquier otro fetch de build. |
| Dividir `app/salon/page.tsx` en server+cliente puede introducir un desajuste de hidratación si el componente cliente asume datos que solo existían en el `"use client"` original (p. ej. lectura directa de `useSession` para "tu mejor marca", que sigue siendo decorativa). | Cubierto en el paso 4 del plan: el nuevo componente cliente conserva toda la lógica existente tal cual, solo cambia de dónde recibe `games` (props en vez de import estático). |
