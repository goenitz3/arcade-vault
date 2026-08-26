# SPEC 07 — Generalización de motor/puntuación y juego jugable de Tetris

> **Estado:** Aprobado
> **Depende de:** 05-asteroids-game, 06-leaderboard-y-catalogo-supabase
> **Fecha:** 2026-08-26
> **Objetivo:** Generalizar la infraestructura de motor y guardado de
> puntuación (hoy acoplada exclusivamente a Asteroids) para soportar
> múltiples juegos con motor propio, y portar el juego de referencia
> `references/started-games/03-tetris/game.js` a un componente jugable real
> en `/juegos/tetris/jugar`, renombrando el placeholder `"caida"` del
> catálogo a `"tetris"` y conectando su leaderboard real a Supabase.

## Alcance

**Dentro:**

### Generalización de infraestructura (previa al port)

- `lib/scores-supabase.ts`: reemplazar `saveAsteroidsScore` por
  `saveScore(entry: { gameId: string; playerName: string; score: number })`,
  que hace `insert` en `scores` con el `game_id` recibido en vez de la
  constante `ASTEROIDS_GAME_ID`.
- `lib/scores-supabase-server.ts`: reemplazar `topAsteroidsScores(limit)`
  por `topScores(gameId: string, limit: number)`, mismo `select`/`order`
  pero filtrando por el `gameId` recibido.
- `components/games/asteroids/AsteroidsGame.tsx`: actualizar su única
  llamada de guardado a `saveScore({ gameId: "asteroids", playerName, score })`
  (sin cambio de comportamiento).
- Nuevo `lib/games-with-engine.ts`: exporta
  `GAMES_WITH_ENGINE = ["asteroids", "tetris"] as const` — lista plana (sin
  importar componentes React) que responde "¿este juego tiene motor propio
  y leaderboard real?", consumida por páginas server y por
  `SalonHallOfFame.tsx`.
- `app/juegos/[id]/page.tsx`: reemplazar `game.id === "asteroids"` por
  `GAMES_WITH_ENGINE.includes(game.id)` para decidir entre `topScores(game.id, 10)`
  y `detailScores(game.id)`.
- `app/salon/page.tsx` y `SalonHallOfFame.tsx`: reemplazar el prop único
  `asteroidsScores: ScoreRow[]` por `realScores: Record<string, ScoreRow[]>`
  (una entrada por cada id de `GAMES_WITH_ENGINE`, obtenida en el server con
  `Promise.all`), y el `ASTEROIDS_ID` hardcodeado por
  `GAMES_WITH_ENGINE.includes(tab)`.
- Nuevo `components/games/engine-registry.tsx` (`"use client"`): mapa
  `id → componente` (`{ asteroids: AsteroidsGame, tetris: TetrisGame }`),
  consumido por `app/juegos/[id]/jugar/page.tsx` en vez del
  `if (game.id === "asteroids")` actual.
- Ningún cambio de comportamiento visible para Asteroids ni para los otros
  6 juegos con puntaje simulado: es un refactor puro de la infraestructura
  existente antes de agregar el segundo motor real.

### Port de Tetris

- Renombrar en `lib/games.ts`/tabla `games` la fila existente
  `id: "caida"` a `id: "tetris"`, `title: "TETRIS"`, `cover: "cover-tetris"`
  (se conservan `short`/`long`/`cat: "PUZZLE"`/`color: "magenta"`/`best: 184220`/
  `plays: "31.8K"` tal cual, sin cambios de copy).
- Renombrar en `app/globals.css` el selector `.cover-tetro` (y su
  `::after`) a `.cover-tetris`.
- Nuevo componente cliente `components/games/tetris/TetrisGame.tsx` y motor
  `components/games/tetris/engine.ts`, que porta a TypeScript la lógica de
  `references/started-games/03-tetris/game.js`: tablero `10×20`, las 7
  piezas estándar (I, O, T, S, Z, J, L — **sin** la pieza "N"/tuerca),
  rotación con wall kicks `[0,±1,±2]`, soft drop / hard drop, pieza
  fantasma, limpieza de líneas, puntuación `[0,100,300,500,800] × nivel`,
  y aceleración de velocidad por nivel (`max(100, 1000 − (nivel−1)×90)` ms).
- Canvas fijo de 300×600 (mismas constantes `COLS/ROWS/BLOCK` que el
  original), escalado visualmente por CSS dentro de `.crt-screen`, igual
  patrón que Asteroids.
- Controles de teclado idénticos al original: `←`/`→` mover, `↑` o `X`
  rotar, `↓` soft drop, `Espacio` hard drop.
- HUD de React (Jugador, Puntuación, Líneas, Nivel) alimentado por
  `EngineSnapshot` vía `onChange`, más una vista previa de la siguiente
  pieza renderizada en React (grid de celdas a partir de `snapshot.nextPiece`,
  sin canvas adicional — reemplaza el `<canvas id="next-canvas">` del
  original).
- Botones propios PAUSA/FIN/SALIR con el mismo comportamiento que
  Asteroids: PAUSA cancela el loop sin perder estado; FIN fuerza
  `state = "gameover"` inmediatamente; SALIR navega a `/juegos/tetris`.
- Modal de "FIN DEL JUEGO" con el mismo flujo que `AsteroidsGame.tsx`:
  input de nombre editable, botón "GUARDAR PUNTUACIÓN" que llama a
  `saveScore({ gameId: "tetris", playerName, score })`, toast "PUNTUACIÓN
  GUARDADA", y acciones "JUGAR DE NUEVO" / "VOLVER AL VAULT". Reutiliza el
  marco visual `.crt`/`.crt-screen`/`.crt-bottom` y `.modal-bd` existentes.
- Cableado vía `components/games/engine-registry.tsx` (ver generalización
  arriba): `/juegos/tetris/jugar` renderiza `TetrisGame`; el resto de
  juegos sin motor propio sigue con `GamePlayer`.
- Leaderboard real de Tetris en `/salon` (pestaña TETRIS) y en
  `/juegos/tetris` vía `topScores("tetris", …)`, con el mismo estado vacío
  ("Aún sin puntuaciones...") que ya usa Asteroids cuando no hay filas.
- Toggle de tema claro/oscuro, portado tal cual del juego de referencia:
  botón propio dentro de `TetrisGame.tsx`, variables CSS locales al
  tablero de Tetris (fondo, grid, panel, `kbd`, overlay) y persistencia en
  `localStorage` (`"tetris-theme"`). Alcance acotado a
  `/juegos/tetris/jugar`: no toca el tema global de Arcade Vault ni ningún
  otro juego, que siguen usando el `.crt` oscuro fijo.
- Limpieza correcta del loop y los listeners de teclado al desmontar
  `TetrisGame.tsx`.

**Fuera de alcance (para specs futuras):**

- La 8ª pieza "N" (tuerca), no estándar y no documentada en el README del
  juego de referencia: se excluye de esta primera versión.
- Un modo claro global para el resto de Arcade Vault (landing, catálogo,
  `/salon`, otros juegos): el toggle de esta spec es local a la pantalla de
  Tetris, igual que en el juego de referencia.
- Controles táctiles/en pantalla para móvil (igual decisión que en la spec
  05 para Asteroids).
- Sonido/música.
- Conectar `game.best` (184220, dato decorativo heredado de "caida") a las
  puntuaciones reales guardadas.
- Tests automatizados.

## Modelo de datos

### Infraestructura generalizada

```ts
// lib/scores-supabase.ts
export async function saveScore(entry: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<void>;

// lib/scores-supabase-server.ts
export async function topScores(gameId: string, limit: number): Promise<ScoreRow[]>;

// lib/games-with-engine.ts
export const GAMES_WITH_ENGINE = ["asteroids", "tetris"] as const;
export type GameWithEngineId = (typeof GAMES_WITH_ENGINE)[number];
```

```tsx
// components/games/engine-registry.tsx
"use client";
import type { ComponentType } from "react";
import type { Game } from "@/lib/types";
import AsteroidsGame from "./asteroids/AsteroidsGame";
import TetrisGame from "./tetris/TetrisGame";

export const ENGINE_COMPONENTS: Record<string, ComponentType<{ game: Game }>> = {
  asteroids: AsteroidsGame,
  tetris: TetrisGame,
};
```

- `SalonHallOfFame.tsx` cambia su firma de props: en vez de
  `asteroidsScores: ScoreRow[]` recibe `realScores: Record<string, ScoreRow[]>`
  (una clave por cada id de `GAMES_WITH_ENGINE`). `app/salon/page.tsx`
  construye ese objeto con
  `Promise.all(GAMES_WITH_ENGINE.map(id => topScores(id, 12)))`.
- No se agregan campos nuevos a `Game`, `ScoreRow` ni `ScoreRecord` en
  `lib/types.ts` (siguen sirviendo tal cual para cualquier juego).

### Motor de Tetris

```ts
// components/games/tetris/engine.ts

export type PieceShape = number[][]; // matriz de índices de color (0 = vacío)

export type EngineSnapshot = {
  score: number;
  lines: number;
  level: number;
  nextPiece: PieceShape;
  state: "playing" | "gameover";
};

export const COLORS: readonly string[]; // paleta indexada 1..7, portada tal cual del original

export type TetrisEngine = {
  start(): void;
  pause(): void;
  resume(): void;
  forceGameOver(): void;       // usado por el botón FIN
  destroy(): void;             // cancela rAF y quita listeners de teclado
  onChange(cb: (snapshot: EngineSnapshot) => void): () => void;
};

export function createEngine(canvas: HTMLCanvasElement): TetrisEngine;
```

- El motor se inicializa contra un único `<canvas width={300} height={600}>`
  y corre su propio `requestAnimationFrame`; `TetrisGame.tsx` no reimplementa
  el loop, solo lo orquesta (mismo patrón que `AsteroidsGame.tsx`).
- `onChange` se dispara una vez por frame con el snapshot actual; el HUD de
  React (score/líneas/nivel) y la vista previa de la siguiente pieza
  (`nextPiece`, renderizada como grid de celdas coloreadas con `COLORS`) se
  alimentan únicamente de este snapshot, sin leer el DOM del canvas.
- No hay estado intermedio análogo a `"dead"` de Asteroids: al colisionar
  un spawn nuevo, `state` pasa directo a `"gameover"`.

### Seed de catálogo

```sql
update public.games
set id = 'tetris', title = 'TETRIS', cover = 'cover-tetris'
where id = 'caida';

update public.scores
set game_id = 'tetris'
where game_id = 'caida';
```

- Migración nueva `supabase/migrations/0002_rename_caida_to_tetris.sql`
  (no se edita la migración `0001` ya aplicada). El `update` sobre `scores`
  es defensivo por si alguna fila llegó a insertarse con `game_id: "caida"`
  antes de esta spec (no debería haber ninguna, ya que `"caida"` nunca tuvo
  motor real).

## Plan de implementación

Cada paso deja la aplicación compilando y navegable. Verificación manual
con `npm run dev`; al cerrar cada paso, `npx tsc --noEmit` y `npm run lint`
en verde.

1. **Migración SQL: renombrar el placeholder en el catálogo.** Crear
   `supabase/migrations/0002_rename_caida_to_tetris.sql` con los `UPDATE`
   de `games`/`scores` del modelo de datos. Aplicarla al proyecto Supabase.
   En `app/globals.css`, renombrar `.cover-tetro`/`.cover-tetro::after` a
   `.cover-tetris`.
   Verificación: `select * from games where id = 'tetris'` devuelve la fila
   con `title: 'TETRIS'`, `cover: 'cover-tetris'`; ya no existe `id: 'caida'`.
   `/games` y `/juegos/tetris` muestran la tarjeta "TETRIS" con la portada
   correcta (misma que tenía "CAÍDA").

2. **Generalizar guardado/lectura de puntuaciones.** En
   `lib/scores-supabase.ts`, reemplazar `saveAsteroidsScore` por
   `saveScore({ gameId, playerName, score })`. En
   `lib/scores-supabase-server.ts`, reemplazar `topAsteroidsScores(limit)`
   por `topScores(gameId, limit)`. Actualizar la única llamada existente en
   `AsteroidsGame.tsx` a `saveScore({ gameId: "asteroids", ... })`.
   Verificación: `npx tsc --noEmit` sin errores; jugar una partida de
   Asteroids y guardar puntuación sigue insertando correctamente en
   Supabase (mismo comportamiento que antes).

3. **`lib/games-with-engine.ts` y detalle de juego.** Crear el archivo con
   `GAMES_WITH_ENGINE = ["asteroids", "tetris"]`. En
   `app/juegos/[id]/page.tsx`, reemplazar `game.id === "asteroids"` por
   `GAMES_WITH_ENGINE.includes(game.id)` para decidir entre `topScores(game.id, 10)`
   y `detailScores(game.id)`.
   Verificación: `/juegos/asteroids` sigue mostrando su leaderboard real sin
   cambios; `/juegos/tetris` (aún sin partidas guardadas) muestra el estado
   vacío "Aún sin puntuaciones" en vez de datos simulados.

4. **Generalizar `/salon`.** En `app/salon/page.tsx`, construir
   `realScores: Record<string, ScoreRow[]>` con
   `Promise.all(GAMES_WITH_ENGINE.map(id => topScores(id, 12)))`. En
   `SalonHallOfFame.tsx`, reemplazar el prop `asteroidsScores`/`ASTEROIDS_ID`
   por `realScores`/`GAMES_WITH_ENGINE.includes(tab)`.
   Verificación: `/salon` pestaña ASTEROIDS sigue mostrando el mismo
   leaderboard real que antes; pestaña TETRIS (sin partidas aún) muestra el
   estado vacío; el resto de pestañas sigue con `hallScores` simulado.

5. **Motor de Tetris portado a TypeScript.** Crear
   `components/games/tetris/engine.ts`: tablero `10×20`, las 7 piezas
   estándar (sin la "N"), `collide`, `rotateCW`/`tryRotate` con wall kicks,
   `merge`, `clearLines`, `ghostY`, `hardDrop`/`softDrop`, puntuación y
   velocidad por nivel — siguiendo 1:1 `references/started-games/03-tetris/game.js`.
   Exponer `createEngine(canvas): TetrisEngine` según el modelo de datos.
   Verificación: `npx tsc --noEmit` sin errores; probado de forma aislada
   (montado temporalmente en una página), el canvas dibuja el tablero y las
   piezas y responde a `←`/`→`/`↑`/`↓`/Espacio.

6. **Componente `TetrisGame.tsx` (base).** Crear
   `components/games/tetris/TetrisGame.tsx` (`"use client"`): monta el
   `<canvas width={300} height={600}>` escalado por CSS dentro de
   `.crt`/`.crt-screen`/`.crt-bottom`, llama a `createEngine` en un efecto,
   se suscribe a `onChange`, y llama a `destroy()` en el cleanup.
   Verificación: montado directamente (aún sin cablear en el paso 9), el
   juego es jugable end-to-end con teclado.

7. **HUD, vista previa y PAUSA/FIN/SALIR.** Agregar el HUD superior
   (Jugador, Puntuación, Líneas, Nivel), la vista previa de la siguiente
   pieza (grid de celdas a partir de `snapshot.nextPiece` y `COLORS`), y los
   botones PAUSA (`pause()`/`resume()`), FIN (`forceGameOver()`) y SALIR
   (`Link` a `/juegos/tetris`).
   Verificación: PAUSA congela el tablero y REANUDAR continúa desde el
   mismo estado; FIN abre el modal de game over inmediatamente; la vista
   previa cambia correctamente cada vez que aparece una nueva pieza.

8. **Modal de fin de juego y guardado.** Agregar el modal "FIN DEL JUEGO"
   (mismo markup que `AsteroidsGame.tsx`: input de nombre, botón "GUARDAR
   PUNTUACIÓN", toast, "JUGAR DE NUEVO"/"VOLVER AL VAULT"), llamando a
   `saveScore({ gameId: "tetris", playerName: name, score })`.
   Verificación: perder la partida (spawn colisiona) o pulsar FIN abre el
   modal con el score real; "GUARDAR PUNTUACIÓN" inserta la fila en
   Supabase y muestra el toast; "JUGAR DE NUEVO" reinicia sin recargar.

9. **Registro de motores y cableado de ruta.** Crear
   `components/games/engine-registry.tsx` con `ENGINE_COMPONENTS`. En
   `app/juegos/[id]/jugar/page.tsx`, reemplazar el `if (game.id === "asteroids")`
   por `const Engine = ENGINE_COMPONENTS[id]; return Engine ? <Engine game={game} /> : <GamePlayer game={game} />;`.
   Verificación: `/juegos/tetris/jugar` y `/juegos/asteroids/jugar` muestran
   sus motores reales; las rutas de los 6 juegos restantes siguen mostrando
   `GamePlayer` sin cambios.

10. **Limpieza al desmontar.** Confirmar que salir de
    `/juegos/tetris/jugar` (SALIR, navegación, cambio de pestaña) cancela el
    `requestAnimationFrame` y remueve los listeners de teclado, sin fugas de
    memoria ni errores en consola.
    Verificación: entrar y salir varias veces de `/juegos/tetris/jugar` sin
    errores en consola ni loops de animación duplicados corriendo en
    segundo plano.

11. **Toggle de tema claro/oscuro.** Portar el botón `theme-toggle` y las
    variables CSS `light-mode` de `references/started-games/03-tetris/style.css`
    a `TetrisGame.tsx`, con las variables locales renombradas/aisladas (p. ej.
    `.tetris-theme-light` en vez de `body.light-mode`, para no chocar con el
    resto de Arcade Vault) y persistencia en `localStorage` (`"tetris-theme"`),
    aplicándose solo dentro del árbol de `TetrisGame.tsx`.
    Verificación: el botón alterna el tablero, panel y overlay entre claro y
    oscuro sin afectar el resto de la página ni de la app; recargar
    `/juegos/tetris/jugar` respeta el último tema elegido; salir a `/games`
    o entrar a `/juegos/asteroids/jugar` muestra el tema oscuro fijo de
    siempre, sin ningún resto del modo claro de Tetris.

## Criterios de aceptación

### General

- [ ] `npm run build` termina sin errores y `npx tsc --noEmit` no reporta nada.
- [ ] `npm run lint` pasa sin errores ni advertencias.
- [ ] No queda ninguna referencia a `caida`/`cover-tetro`/`ASTEROIDS_GAME_ID`/
      `saveAsteroidsScore`/`topAsteroidsScores`/`ASTEROIDS_ID` en el código.

### Catálogo

- [ ] `/games` muestra la tarjeta "TETRIS" (antes "CAÍDA") con la misma
      portada, categoría `PUZZLE`, `best` y `plays` que tenía "CAÍDA".
- [ ] `/juegos/tetris` (página de detalle) carga sin errores y su botón
      "▶ JUGAR AHORA" navega a `/juegos/tetris/jugar`.

### Generalización de infraestructura

- [ ] `saveScore`/`topScores` aceptan `gameId` como parámetro; no existe
      ninguna función atada exclusivamente a Asteroids.
- [ ] `GAMES_WITH_ENGINE` es la única fuente de verdad usada para decidir
      leaderboard real vs. simulado y motor real vs. `GamePlayer`, tanto en
      `app/juegos/[id]/page.tsx`, `app/juegos/[id]/jugar/page.tsx` como en
      `SalonHallOfFame.tsx`.
- [ ] Asteroids sigue funcionando exactamente igual que antes de este
      refactor (guardado, lectura de leaderboard, motor jugable) — sin
      regresiones de comportamiento.

### Juego jugable (Tetris)

- [ ] `/juegos/tetris/jugar` renderiza `TetrisGame`, no `GamePlayer`.
- [ ] `←`/`→` mueven la pieza, `↑`/`X` rotan con wall kicks, `↓` hace soft
      drop, `Espacio` hace hard drop.
- [ ] Solo aparecen las 7 piezas estándar (I, O, T, S, Z, J, L); la pieza
      "N" (tuerca) del original nunca aparece.
- [ ] La pieza fantasma se muestra en la posición de aterrizaje correcta.
- [ ] Completar una fila la elimina y desplaza el tablero hacia abajo,
      sumando puntos según `[0,100,300,500,800] × nivel`.
- [ ] El nivel sube cada 10 líneas y la velocidad de caída aumenta acorde a
      `max(100, 1000 − (nivel−1)×90)` ms.
- [ ] El HUD de React (Puntuación/Líneas/Nivel) y la vista previa de la
      siguiente pieza reflejan siempre el `EngineSnapshot` actual.
- [ ] Cuando una pieza nueva colisiona al aparecer, `state` pasa a
      `"gameover"` y se abre el modal "FIN DEL JUEGO" con el puntaje final
      correcto.
- [ ] PAUSA congela el tablero (piezas dejan de moverse) y REANUDAR
      continúa exactamente desde ese mismo estado.
- [ ] FIN abre el modal "FIN DEL JUEGO" de inmediato, sin esperar a un
      game over real.
- [ ] SALIR navega a `/juegos/tetris` sin errores en consola.
- [ ] El toggle de tema claro/oscuro alterna correctamente el tablero, el
      panel y el overlay dentro de `/juegos/tetris/jugar`, y recuerda la
      elección en `localStorage` (`"tetris-theme"`) entre recargas.
- [ ] El toggle de tema no afecta ninguna otra pantalla de Arcade Vault
      (landing, catálogo, `/salon`, `/juegos/asteroids/jugar` ni el resto de
      juegos con `GamePlayer`), que siguen mostrando su estilo oscuro fijo.

### Guardado de puntuación

- [ ] En el modal "FIN DEL JUEGO", escribir un nombre y pulsar "GUARDAR
      PUNTUACIÓN" inserta una fila real en la tabla `scores` de Supabase
      con `game_id: "tetris"` y el `score` real de la partida.
- [ ] Tras guardar, se muestra el toast "PUNTUACIÓN GUARDADA" y el botón de
      guardar desaparece.
- [ ] Esa puntuación aparece en `/salon` (pestaña TETRIS) y en el panel
      `Leaderboard` de `/juegos/tetris`, ordenada de mayor a menor.
- [ ] Antes de guardar ninguna puntuación, `/salon` (pestaña TETRIS) y
      `/juegos/tetris` muestran el estado "Aún sin puntuaciones" en vez de
      datos simulados o un error.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva (score en 0, líneas en 0,
      nivel 1) sin recargar la página.

### Aislamiento de otros juegos

- [ ] Los 6 juegos restantes del catálogo (sin motor propio) siguen usando
      `GamePlayer.tsx` y `hallScores`/`detailScores` simulados sin ningún
      cambio de comportamiento.
- [ ] Asteroids sigue aislado de Tetris: ningún estado ni componente
      compartido entre `AsteroidsGame.tsx` y `TetrisGame.tsx` más allá de la
      infraestructura genérica (`saveScore`/`topScores`/`GAMES_WITH_ENGINE`/
      `ENGINE_COMPONENTS`).

### Limpieza de recursos

- [ ] Salir de `/juegos/tetris/jugar` y volver a entrar varias veces no
      genera errores en consola ni dobles loops de animación corriendo en
      simultáneo.

## Decisiones tomadas y descartadas

### Generalización de infraestructura

- **Sí:** generalizar `scores-supabase(-server).ts`, la decisión de motor
  real (`app/juegos/[id]/jugar/page.tsx`) y la de leaderboard real
  (`app/juegos/[id]/page.tsx`, `SalonHallOfFame.tsx`) en esta misma spec,
  antes de portar Tetris. Decisión explícita del usuario tras confirmar el
  hallazgo: esta es la primera spec que porta un segundo motor propio, y
  aplazarlo habría dejado el `if (game.id === "asteroids")` duplicado en
  tres lugares distintos con un patrón ya conocido de antemano.
- **Sí:** una lista plana (`GAMES_WITH_ENGINE`, sin importar componentes
  React) como fuente de verdad para páginas server, separada del registro
  de componentes (`ENGINE_COMPONENTS`, cliente) usado solo para renderizar
  el motor. Evita que páginas server que solo necesitan decidir la fuente
  del leaderboard (`app/juegos/[id]/page.tsx`) arrastren el bundle de los
  componentes de juego.
- **No:** extraer una interfaz de motor genérica (tipo `Engine<TSnapshot>`)
  que unifique `AsteroidsEngine`/`TetrisEngine` en un solo tipo compartido.
  Ambos motores exponen la misma forma (`start/pause/resume/forceGameOver/
  destroy/onChange`) por convención, pero cada `EngineSnapshot` tiene campos
  propios del juego (`lives` vs. `lines`/`nextPiece`); forzar un tipo
  genérico ahora es prematuro con solo dos motores portados.

### Catálogo

- **Sí:** renombrar la entrada existente `"caida"` a `"tetris"` en vez de
  crear una fila nueva, replicando el precedente de `"rocas"` →
  `"asteroids"` de la spec 05. `"caida"` ya era el placeholder pensado para
  este mismo juego ("Encaja las piezas antes de que el techo te aplaste").
- **Sí:** conservar tal cual el `short`/`long`/`cat`/`color`/`best`/`plays`
  ya sembrados de `"caida"` (incluido `color: "magenta"`, aunque la
  propuesta inicial del asistente era `cyan`). Mismo criterio que Asteroids:
  no se reescribe copy/datos decorativos ya existentes en el catálogo salvo
  pedido explícito.

### Alcance reducido del motor

- **Sí:** excluir la 8ª pieza "N" (tuerca) del juego de referencia. No es
  una pieza estándar de Tetris, no está documentada en el README del juego
  de referencia, y su inclusión habría sido una desviación silenciosa del
  Tetris clásico reconocible que el catálogo promete.
- **Sí:** portar el toggle de tema claro/oscuro propio del juego de
  referencia, pero con alcance acotado a `/juegos/tetris/jugar` (decisión
  explícita del usuario tras evaluar un modo claro global para toda Arcade
  Vault). Se replican las variables CSS del original de forma aislada
  dentro de `TetrisGame.tsx`, sin tocar `.crt`/`.crt-screen` ni ningún otro
  juego, que siguen con el tema oscuro fijo de siempre.
- **No:** extender el toggle a un modo claro global para el resto de
  Arcade Vault. Definir variables claras para landing, catálogo, `/salon` y
  los demás juegos es un alcance mucho mayor no pedido; se limita a
  replicar el comportamiento acotado del juego de referencia.
- **Sí:** exponer `nextPiece` en `EngineSnapshot` y renderizar la vista
  previa de la siguiente pieza en React en vez de con un segundo
  `<canvas>` (como hacía el original). Mantiene una sola fuente de verdad
  (`onChange`) para todo el HUD, igual que el patrón de HUD doble
  sincronizado que ya usa Asteroids.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El refactor de `saveScore`/`topScores`/`GAMES_WITH_ENGINE` toca código que hoy usa Asteroids en producción; un error de parametrización podría romper silenciosamente su guardado o su leaderboard. | Cubierto explícitamente en los pasos 2–4 del plan, cada uno con verificación manual de que Asteroids sigue funcionando igual antes de tocar nada de Tetris; además listado en criterios de aceptación ("Generalización de infraestructura"). |
| Migrar `scores` con `game_id: "caida"` → `"tetris"` es irreversible una vez aplicada la migración 0002; si alguna fila ya existía con `game_id: "caida"` por error, el `UPDATE` la reasignaría a Tetris sin distinguir su origen real. | Aceptado: `"caida"` nunca tuvo motor real ni flujo de guardado antes de esta spec, así que no debería tener filas en `scores`; el `UPDATE` sobre `scores` es defensivo, no se espera que afecte ninguna fila. |
| Renombrar `"caida"` a `"tetris"` cambia la URL pública `/juegos/caida` → `/juegos/tetris`; cualquier enlace externo a la anterior dejará de funcionar (`notFound()`). | Aceptado, mismo criterio que la spec 05 con `rocas` → `asteroids`: el proyecto está en etapa inicial sin usuarios reales que preservar. |
| Renderizar la vista previa de la siguiente pieza en React (en vez de canvas) podría introducir un parpadeo visual si `onChange` se dispara más veces de las necesarias por frame. | Mitigado por diseño: `onChange` se dispara una única vez por frame (mismo contrato que `AsteroidsEngine`), y React solo re-renderiza si el snapshot cambia de referencia. |
| Las variables CSS del toggle de tema (`light-mode` en el original) podrían chocar por nombre con clases globales de `app/globals.css` o "filtrarse" fuera de `TetrisGame.tsx` si no quedan correctamente ámbito-acotadas (scoped). | Cubierto en el paso 11 del plan: se renombran/aíslan explícitamente (p. ej. `.tetris-theme-light`) y la verificación incluye confirmar que salir de la ruta no deja ningún resto del modo claro en el resto de la app. |
