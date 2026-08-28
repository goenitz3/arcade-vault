# SPEC 09 — Juego jugable de Snake

> **Estado:** Implementado
> **Depende de:** 05-asteroids-game, 06-leaderboard-y-catalogo-supabase, 07-tetris
> **Fecha:** 2026-08-28
> **Objetivo:** Portar el juego de referencia `references/started-games/05-snake/game.js` a un componente jugable real en `/juegos/snake/jugar`, renombrando el placeholder `"serpentina"` del catálogo a `"snake"` y conectando su leaderboard real a Supabase vía la infraestructura ya generalizada en la spec 07.

## Alcance

**Dentro:**

- Renombrar en la fila de Supabase (tabla `games`) `id: "serpentina"` →
  `id: "snake"`, `title: "SNAKE"`, `cover: "cover-snake"` (se conservan
  `short`/`long`/`cat: "ARCADE"`/`color: "green"`/`best: 7820`/`plays: "9.1K"`
  tal cual, sin cambios de copy).
- Migración SQL nueva `supabase/migrations/0004_rename_serpentina_to_snake.sql`
  con los `UPDATE` de `games`/`scores`.
- Ninguna clase CSS que renombrar: `.cover-snake` ya existe en
  `app/globals.css` con el nombre correcto (a diferencia de las specs
  05/07/08).
- Portar el asset de imagen del juego de referencia: copiar
  `references/started-games/05-snake/fruits.png` a
  `public/games/snake/fruits.png`. Las coordenadas de recorte de
  `sprites.js` se trasladan a una constante TypeScript
  (`components/games/snake/sprites.ts`, `FRUIT_ATLAS`), no se copia el
  `.js` con el `window.SPRITE_ATLAS` global. Es el primer juego del
  catálogo que sirve un asset de imagen real.
- Nuevo componente cliente `components/games/snake/SnakeGame.tsx` y motor
  `components/games/snake/engine.ts`, que porta a TypeScript la lógica de
  `references/started-games/05-snake/game.js`: rejilla `32×24` (celda de
  25 px), serpiente con paso fijo, encolado de dirección con bloqueo de
  reversa de 180°, aparición de fruta aleatoria en celda libre, crecimiento
  y `+10` puntos por fruta, nivel `⌊frutas/5⌋ + 1` con aceleración
  `max(80, 170 − (nivel−1)×10)` ms por paso, colisión con muros y con el
  propio cuerpo, y los estados `playing`/`gameover`/`win`.
- Canvas fijo de 800×600 (mismas constantes `CELL`/`COLS`/`ROWS` que el
  original), escalado visualmente por CSS dentro de `.crt-screen`, igual
  patrón que Asteroids, Tetris y Arkanoid.
- La comida se dibuja con el sprite de fruta correspondiente recortado de
  `fruits.png` (fila pixelada del atlas), no vectorialmente.
- Controles de teclado: `←`/`→`/`↑`/`↓` y `W`/`A`/`S`/`D` mueven la
  serpiente (ambos esquemas, portados del juego de referencia). Es el único
  juego del catálogo con teclas alternativas de dirección.
- HUD de React (Jugador, Puntuación, Nivel, Largo) alimentado por
  `EngineSnapshot` vía `onChange`, mismo patrón que Asteroids/Tetris/Arkanoid.
- Botones propios PAUSA/FIN/SALIR con el mismo comportamiento que los otros
  tres motores: PAUSA cancela el loop sin perder estado; FIN fuerza
  `state = "gameover"` inmediatamente; SALIR navega a `/juegos/snake`.
- Modal de fin de juego con el mismo flujo que
  `AsteroidsGame.tsx`/`TetrisGame.tsx`/`ArkanoidGame.tsx`: input de nombre
  editable, botón "GUARDAR PUNTUACIÓN" que llama a
  `saveScore({ gameId: "snake", playerName, score })`, toast "PUNTUACIÓN
  GUARDADA", y acciones "JUGAR DE NUEVO" / "VOLVER AL VAULT". El título del
  modal es "FIN DEL JUEGO" cuando `state === "gameover"` y "¡PERFECTO!"
  cuando `state === "win"`; ambos casos reutilizan el mismo flujo de
  guardado.
- Registrar `"snake"` en `lib/games-with-engine.ts` (`GAMES_WITH_ENGINE`) y
  en `components/games/engine-registry.tsx` (`ENGINE_COMPONENTS`).
- Leaderboard real de Snake en `/salon` (pestaña SNAKE) y en `/juegos/snake`
  vía `topScores("snake", …)`, con el mismo estado vacío ("Aún sin
  puntuaciones") que ya usan Asteroids, Tetris y Arkanoid.
- Limpieza correcta del loop y de los listeners de teclado al desmontar
  `SnakeGame.tsx`.

**Fuera de alcance (para specs futuras):**

- Los atajos de teclado `P`/`Esc` (pausa) y `R` (reiniciar) del juego de
  referencia: se reemplazan por los botones de React PAUSA y "JUGAR DE
  NUEVO", igual que en Asteroids/Tetris/Arkanoid. El teclado solo mueve la
  serpiente.
- Controles táctiles/en pantalla para móvil (misma decisión que las specs
  05, 07 y 08).
- Sonido/efectos de audio (el juego de referencia no tiene).
- La fila central pixelada del atlas es la única que se usa (como en el
  `sprites.js` original); las otras dos filas de `fruits.png` no se portan.
- Conectar `game.best` (7820, dato decorativo heredado de "serpentina") a
  las puntuaciones reales guardadas.
- Ajustar el `long` del catálogo (menciona "núcleos magenta"; el juego
  real usa frutas): se conserva el copy tal cual, mismo criterio que las
  specs 05/07/08.
- Tests automatizados.

## Modelo de datos

No se agregan campos nuevos a `Game`, `ScoreRow` ni `ScoreRecord` en
`lib/types.ts` (siguen sirviendo tal cual). Sí define el contrato interno
del motor portado, el atlas de sprites y cómo se comunica con React.

```ts
// components/games/snake/sprites.ts

export type FruitSprite = { x: number; y: number; w: number; h: number };

// Recortes de la fila pixelada de public/games/snake/fruits.png,
// trasladados 1:1 de references/started-games/05-snake/sprites.js.
export const FRUIT_SHEET_SRC = "/games/snake/fruits.png";
export const FRUIT_ATLAS: Record<string, FruitSprite>; // banana, orange, ... (22 frutas)
```

```ts
// components/games/snake/engine.ts

export type EngineSnapshot = {
  score: number;
  level: number;    // 1, 2, 3, ... = ⌊frutas comidas / 5⌋ + 1
  length: number;   // nº de segmentos de la serpiente (inicia en 3)
  state: "playing" | "gameover" | "win";
};

export type SnakeEngine = {
  start(): void;
  pause(): void;
  resume(): void;
  forceGameOver(): void;   // usado por el botón FIN
  destroy(): void;         // cancela rAF y quita listeners de teclado
  onChange(cb: (snapshot: EngineSnapshot) => void): () => void;
};

export function createEngine(canvas: HTMLCanvasElement): SnakeEngine;
```

Convenciones:

- Origen de coordenadas arriba-izquierda. La rejilla es de `COLS = 32` ×
  `ROWS = 24` celdas de `CELL = 25` px (canvas fijo 800×600).
- La serpiente es un array de celdas `{ x, y }`; `snake[0]` es la cabeza.
  La comida es `{ x, y, key }` donde `key` indexa `FRUIT_ATLAS`.
- El motor se inicializa contra un único `<canvas width={800} height={600}>`
  y corre su propio `requestAnimationFrame` con paso fijo (acumulador de
  `dt` capado a 100 ms); `SnakeGame.tsx` no reimplementa el loop, solo lo
  orquesta (mismo patrón que `AsteroidsGame.tsx`/`TetrisGame.tsx`/
  `ArkanoidGame.tsx`).
- El intervalo por paso es `max(80, 170 − (level − 1) × 10)` ms (curva
  "suave": más lenta que el juego de referencia, que usaba `max(60, 130 − …)`).
- El encolado de dirección se valida contra la dirección ya consolidada
  (`dir`), de modo que un paso nunca puede ser una reversa de 180°.
- `onChange` se dispara una vez por frame con el snapshot actual; el HUD de
  React se alimenta únicamente de este snapshot, sin leer el DOM del canvas.
- No hay estado intermedio análogo a `"dead"` de Asteroids: al chocar con
  un muro o con el propio cuerpo, `state` pasa directo a `"gameover"`.
- Llenar las `COLS × ROWS = 768` celdas hace pasar `state` a `"win"`
  directamente, sin pasar por `"gameover"`.

### Seed de catálogo

```sql
update public.games
set id = 'snake', title = 'SNAKE', cover = 'cover-snake'
where id = 'serpentina';

update public.scores
set game_id = 'snake'
where game_id = 'serpentina';
```

- Migración nueva `supabase/migrations/0004_rename_serpentina_to_snake.sql`
  (no se editan las migraciones `0001`/`0002`/`0003` ya aplicadas). El
  `cover` ya vale `cover-snake`; se incluye en el `SET` por consistencia
  con las migraciones `0002`/`0003`. El `UPDATE` sobre `scores` es
  defensivo, igual criterio que las migraciones anteriores: `"serpentina"`
  nunca tuvo motor real ni flujo de guardado.

## Plan de implementación

Cada paso deja la aplicación compilando y navegable. Verificación manual
con `npm run dev`; al cerrar cada paso, `npx tsc --noEmit` y `npm run lint`
en verde. La spec 07 ya generalizó `saveScore`/`topScores`/
`GAMES_WITH_ENGINE`/`ENGINE_COMPONENTS`, así que no hay pasos de
generalización de infraestructura: esta spec solo agrega la entrada
`"snake"` a esas dos listas (paso 7).

1. **Migración SQL: renombrar el placeholder en el catálogo.** Crear
   `supabase/migrations/0004_rename_serpentina_to_snake.sql` con los
   `UPDATE` de `games`/`scores` del modelo de datos. Aplicarla al proyecto
   Supabase. No hay clase CSS que tocar (`.cover-snake` ya existe).
   Verificación: `select * from games where id = 'snake'` devuelve la fila
   con `title: 'SNAKE'`, `cover: 'cover-snake'`; ya no existe
   `id: 'serpentina'`. `/games` y `/juegos/snake` muestran la tarjeta
   "SNAKE" con la portada correcta (misma que tenía "SERPENTINA").

2. **Asset de fruta y atlas de sprites.** Copiar
   `references/started-games/05-snake/fruits.png` a
   `public/games/snake/fruits.png`. Crear `components/games/snake/sprites.ts`
   con `FRUIT_SHEET_SRC` y `FRUIT_ATLAS` (los 22 recortes de la fila
   pixelada, trasladados 1:1 de `references/started-games/05-snake/sprites.js`).
   Verificación: `npx tsc --noEmit` sin errores; `FRUIT_ATLAS` exporta las
   22 claves de fruta con `{ x, y, w, h }`; `public/games/snake/fruits.png`
   se sirve en `http://localhost:3000/games/snake/fruits.png`.

3. **Motor de Snake portado a TypeScript.** Crear
   `components/games/snake/engine.ts`: rejilla `32×24`, serpiente como
   array de celdas, `dir`/`nextDir` con bloqueo de reversa de 180°,
   `spawnFood` en celda libre con fruta aleatoria de `FRUIT_ATLAS`,
   crecimiento y `+10` por fruta, `level = ⌊frutas/5⌋ + 1`, paso fijo con
   intervalo `max(80, 170 − (level−1)×10)` ms y `dt` capado a 100 ms,
   colisión con muros y cuerpo, estados `playing`/`gameover`/`win`,
   carga de `fruits.png` vía `new Image()` antes de arrancar el loop —
   siguiendo 1:1 `references/started-games/05-snake/game.js`. Exponer
   `createEngine(canvas): SnakeEngine` según el modelo de datos.
   Verificación: `npx tsc --noEmit` sin errores; probado de forma aislada
   (montado temporalmente en una página), el canvas dibuja el tablero, la
   serpiente y la fruta con su sprite, y responde a `←`/`→`/`↑`/`↓` y
   `W`/`A`/`S`/`D`.

4. **Componente `SnakeGame.tsx` (base).** Crear
   `components/games/snake/SnakeGame.tsx` (`"use client"`): monta el
   `<canvas width={800} height={600}>` escalado por CSS dentro de
   `.crt`/`.crt-screen`/`.crt-bottom`, llama a `createEngine` en un efecto,
   se suscribe a `onChange`, y llama a `destroy()` en el cleanup del efecto.
   Verificación: montado directamente (aún sin cablear en el paso 7), el
   juego es jugable end-to-end con teclado.

5. **HUD y PAUSA/FIN/SALIR.** Agregar el HUD superior (Jugador, Puntuación,
   Nivel, Largo) alimentado por `EngineSnapshot`, y los botones PAUSA
   (`pause()`/`resume()`), FIN (`forceGameOver()`) y SALIR (`Link` a
   `/juegos/snake`).
   Verificación: el HUD refleja score/nivel/largo en tiempo real; PAUSA
   congela el juego (la serpiente deja de avanzar) y REANUDAR continúa
   desde el mismo estado; FIN abre el modal de game over inmediatamente.

6. **Modal de fin de juego y guardado.** Agregar el modal "FIN DEL JUEGO" /
   "¡PERFECTO!" (mismo markup que
   `AsteroidsGame.tsx`/`TetrisGame.tsx`/`ArkanoidGame.tsx`: input de nombre,
   botón "GUARDAR PUNTUACIÓN", toast, "JUGAR DE NUEVO"/"VOLVER AL VAULT"),
   llamando a `saveScore({ gameId: "snake", playerName: name, score })`. El
   título es "FIN DEL JUEGO" con `state === "gameover"` y "¡PERFECTO!" con
   `state === "win"`.
   Verificación: chocar con un muro o con el cuerpo (o pulsar FIN) abre el
   modal "FIN DEL JUEGO" con el score real; "GUARDAR PUNTUACIÓN" inserta la
   fila en Supabase y muestra el toast; "JUGAR DE NUEVO" reinicia una
   partida nueva (score 0, largo 3, nivel 1) sin recargar la página.

7. **Registro de motores y cableado de ruta.** Agregar `"snake"` a
   `GAMES_WITH_ENGINE` en `lib/games-with-engine.ts` y a `ENGINE_COMPONENTS`
   en `components/games/engine-registry.tsx`.
   Verificación: `/juegos/snake/jugar` renderiza `SnakeGame`, no
   `GamePlayer`; `/juegos/snake` y `/salon` (pestaña SNAKE) muestran el
   estado "Aún sin puntuaciones" hasta que se guarde la primera partida
   real; Asteroids, Tetris, Arkanoid y los 4 juegos con `GamePlayer` no
   cambian de comportamiento.

8. **Limpieza al desmontar.** Confirmar que salir de `/juegos/snake/jugar`
   (SALIR, navegación del navegador, cambio de pestaña) cancela el
   `requestAnimationFrame` y remueve los listeners de teclado del motor
   (dentro de `destroy()`), sin fugas de memoria ni errores en consola.
   Verificación: entrar y salir varias veces de `/juegos/snake/jugar` sin
   errores en consola ni loops de animación duplicados corriendo en
   segundo plano.

## Criterios de aceptación

### General

- [ ] `npm run build` termina sin errores y `npx tsc --noEmit` no reporta nada.
- [ ] `npm run lint` pasa sin errores ni advertencias.
- [ ] No queda ninguna referencia a `serpentina` en el código ni en la base
      de datos.

### Catálogo

- [ ] `/games` muestra la tarjeta "SNAKE" (antes "SERPENTINA") con la misma
      portada, categoría `ARCADE`, `color` verde, `best` y `plays` que tenía
      "SERPENTINA".
- [ ] `/juegos/snake` (página de detalle) carga sin errores y su botón
      "▶ JUGAR AHORA" navega a `/juegos/snake/jugar`.

### Juego jugable

- [ ] `/juegos/snake/jugar` renderiza `SnakeGame`, no `GamePlayer`.
- [ ] `←`/`→`/`↑`/`↓` y `W`/`A`/`S`/`D` cambian la dirección de la serpiente.
- [ ] Pulsar la dirección opuesta a la marcha actual no invierte la
      serpiente sobre sí misma (se ignora).
- [ ] La serpiente avanza sola a paso fijo; comer una fruta la alarga un
      segmento y suma exactamente 10 puntos.
- [ ] Al comer una fruta aparece otra fruta nueva en una celda libre, con
      un sprite recortado de `fruits.png` (no una forma vectorial).
- [ ] El nivel sube cada 5 frutas y el intervalo por paso baja según
      `max(80, 170 − (nivel−1)×10)` ms (la serpiente se vuelve más rápida).
- [ ] Chocar contra un muro pone `state` en `"gameover"`.
- [ ] Chocar contra el propio cuerpo pone `state` en `"gameover"`.
- [ ] Ocupar las 768 celdas pone `state` en `"win"` (no `"gameover"`).
- [ ] El HUD de React (Puntuación/Nivel/Largo) refleja siempre el
      `EngineSnapshot` actual.
- [ ] PAUSA congela el juego (la serpiente deja de avanzar) y REANUDAR
      continúa exactamente desde ese mismo estado.
- [ ] FIN abre el modal "FIN DEL JUEGO" de inmediato, sin esperar a un
      choque real.
- [ ] El modal se titula "FIN DEL JUEGO" cuando `state === "gameover"` y
      "¡PERFECTO!" cuando `state === "win"`.
- [ ] SALIR navega a `/juegos/snake` sin errores en consola.

### Guardado de puntuación

- [ ] En el modal de fin de juego, escribir un nombre y pulsar "GUARDAR
      PUNTUACIÓN" inserta una fila real en la tabla `scores` de Supabase
      con `game_id: "snake"` y el `score` real de la partida.
- [ ] Tras guardar, se muestra el toast "PUNTUACIÓN GUARDADA" y el botón de
      guardar desaparece.
- [ ] Esa puntuación aparece en `/salon` (pestaña SNAKE) y en el panel
      `Leaderboard` de `/juegos/snake`, ordenada de mayor a menor.
- [ ] Antes de guardar ninguna puntuación, `/salon` (pestaña SNAKE) y
      `/juegos/snake` muestran el estado "Aún sin puntuaciones" en vez de
      datos simulados o un error.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva (score 0, largo 3,
      nivel 1) sin recargar la página.

### Aislamiento de otros juegos

- [ ] Asteroids, Tetris y Arkanoid siguen funcionando exactamente igual que
      antes de esta spec (guardado, lectura de leaderboard, motor jugable),
      sin regresiones de comportamiento.
- [ ] Los 4 juegos restantes del catálogo (sin motor propio) siguen usando
      `GamePlayer.tsx` y `hallScores`/`detailScores` simulados sin ningún
      cambio de comportamiento.
- [ ] Ningún estado ni componente compartido entre `SnakeGame.tsx` y
      `AsteroidsGame.tsx`/`TetrisGame.tsx`/`ArkanoidGame.tsx` más allá de la
      infraestructura genérica (`saveScore`/`topScores`/`GAMES_WITH_ENGINE`/
      `ENGINE_COMPONENTS`).

### Limpieza de recursos

- [ ] Salir de `/juegos/snake/jugar` y volver a entrar varias veces no
      genera errores en consola ni dobles loops de animación corriendo en
      simultáneo.

## Decisiones tomadas y descartadas

### Catálogo

- **Sí:** renombrar la entrada existente `"serpentina"` a `"snake"` en vez
  de crear una fila nueva. Mismo precedente que `"rocas"` → `"asteroids"`
  (spec 05), `"caida"` → `"tetris"` (spec 07) y `"bloque-buster"` →
  `"arkanoid"` (spec 08); `"serpentina"` ya era el placeholder pensado para
  este mismo juego ("Crece sin morder tu propia cola").
- **Sí:** conservar tal cual `short`/`long`/`cat`/`color`/`best`/`plays` ya
  sembrados de `"serpentina"`, incluida la frase del `long` "buscando
  núcleos magenta" aunque el juego real use frutas y acento verde. Mismo
  criterio que Asteroids/Tetris/Arkanoid: no se reescribe copy ni datos
  decorativos existentes salvo pedido explícito. Se documenta como
  fuera de alcance para una spec futura de copy.
- **N/A:** no hay clase CSS que renombrar. `.cover-snake` ya existe en
  `app/globals.css` con el nombre correcto, a diferencia de las specs
  05/07/08 que sí renombraron `.cover-rocas`/`.cover-tetro`/`.cover-bricks`.

### Infraestructura

- **No:** modificar `lib/scores-supabase(-server).ts`,
  `app/juegos/[id]/page.tsx`, `app/juegos/[id]/jugar/page.tsx` ni
  `SalonHallOfFame.tsx`/`app/salon/page.tsx`. La spec 07 ya los generalizó
  por completo (`saveScore`/`topScores` parametrizados por `gameId`,
  `GAMES_WITH_ENGINE` y `ENGINE_COMPONENTS` como única fuente de verdad) y
  la spec 08 ya sumó Arkanoid sin tocarlos; esta spec solo agrega la
  entrada `"snake"` a esas dos listas.

### Render de la comida

- **Sí:** portar `fruits.png` a `public/games/snake/` y dibujar cada fruta
  con su recorte del atlas. Decisión explícita del usuario. Es el primer
  juego del catálogo que sirve un asset de imagen real; la fruta es el
  único elemento del juego de referencia que depende de la imagen (la
  serpiente y el tablero ya se dibujan con formas de canvas).
- **No:** dibujar la comida vectorialmente (forma de canvas del color de
  acento) como hacen Asteroids, Tetris y Arkanoid. Se evaluó por
  consistencia con esos tres motores; el usuario prefirió conservar los
  sprites de fruta del original.
- **No:** copiar `sprites.js` tal cual (define `window.SPRITE_ATLAS` como
  global). Las coordenadas se trasladan a una constante TypeScript tipada
  (`FRUIT_ATLAS` en `components/games/snake/sprites.ts`), evitando un
  global de navegador en un componente React.
- **Sí:** usar solo la fila pixelada del atlas (22 frutas), igual que el
  `sprites.js` del juego de referencia. Las otras dos filas de `fruits.png`
  quedan fuera de alcance.

### Controles

- **Sí:** portar tanto `←`/`→`/`↑`/`↓` como `W`/`A`/`S`/`D`. Decisión
  explícita del usuario. Es el único juego del catálogo con teclas
  alternativas de dirección; Asteroids y Tetris son solo flechas y Arkanoid
  es flechas + mouse.
- **No:** portar los atajos `P`/`Esc` (pausa) y `R` (reiniciar) del juego
  de referencia. Se reemplazan por los botones de React PAUSA y "JUGAR DE
  NUEVO", igual que en Asteroids/Tetris/Arkanoid, para no introducir un
  segundo modelo de interacción por teclado fuera del movimiento.
- **No:** controles táctiles/en pantalla. Mismo criterio que las specs 05,
  07 y 08; no se pidió soporte móvil real todavía.

### Modelo del motor

- **Sí:** `EngineSnapshot` con `score`/`level`/`length`/`state`. `length`
  (nº de segmentos) ocupa el lugar del tercer valor del HUD, como `lines`
  en Tetris — Snake no tiene concepto de "vidas".
- **Sí:** modelar `"win"` como tercer valor de `state`, distinto de
  `"gameover"`, con su propio título de modal ("¡PERFECTO!", el mismo texto
  del overlay del juego de referencia). Mismo patrón que `"win"` en
  Arkanoid (spec 08). Se evaluó dejarlo fuera por ser casi inalcanzable
  (768 celdas); el usuario pidió mantenerlo.
- **Sí:** paso fijo con `dt` capado a 100 ms, el valor del juego de
  referencia. Asteroids capa a 50 ms, pero se conserva el del original de
  Snake para no alterar su sensación de juego.
- **Sí:** bajar la curva de velocidad respecto al juego de referencia.
  Pedido explícito del usuario: la serpiente arrancaba demasiado rápido.
  El original usa `max(60, 130 − (nivel−1)×10)` ms; se cambia a la curva
  "suave" `max(80, 170 − (nivel−1)×10)` ms (`STEP_BASE = 170`,
  `STEP_MIN = 80`, `STEP_DECAY = 10` sin tocar). Sigue acelerando un
  escalón de 10 ms por nivel, solo que desde un paso base más lento y con
  un piso de velocidad menos agresivo.
- **No:** estado intermedio análogo a `"dead"` de Asteroids. Snake no tiene
  reaparición: el choque lleva directo a `"gameover"`.

### Sonido

- **Sí:** dejar el sonido fuera de alcance. El juego de referencia de Snake
  no tiene audio, y ninguno de los tres motores ya portados
  (Asteroids/Tetris/Arkanoid) lo tiene.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Es el primer juego del catálogo que sirve un asset de imagen desde `public/`; si `fruits.png` no carga (ruta mal escrita, 404), la comida no se dibujaría y el juego quedaría sin objetivo visible. | El paso 3 arranca el loop solo tras `img.onload` (mismo patrón que el `loadSpritesheet(cb)` del juego de referencia); el paso 2 verifica que `http://localhost:3000/games/snake/fruits.png` responde antes de tocar el motor. |
| Las coordenadas de `FRUIT_ATLAS` se trasladan a mano desde `sprites.js`; un recorte mal copiado mostraría una fruta cortada o corrida. | El paso 2 verifica las 22 claves con su `{ x, y, w, h }`; el paso 3 verifica visualmente que la fruta se dibuja completa dentro de su celda. Las coordenadas son un traslado 1:1, sin recalcular. |
| El canvas fijo 800×600 escalado por CSS dentro de `.crt-screen` (responsivo) puede verse borroso o con la rejilla pixelada en pantallas anchas. | Aceptado: misma limitación y misma decisión que Asteroids/Tetris/Arkanoid; se preserva la física de rejilla del original en vez de reescribir a coordenadas relativas. |
| Si `destroy()` no cancela el `requestAnimationFrame` o no quita los listeners de `keydown` al desmontar, el juego seguiría corriendo en segundo plano o dejaría listeners duplicados al reentrar a la ruta. | Cubierto en el paso 8 del plan y en criterios de aceptación ("Limpieza de recursos"); se verifica entrando y saliendo varias veces de `/juegos/snake/jugar`. |
| Renombrar `"serpentina"` a `"snake"` cambia la URL pública `/juegos/serpentina` → `/juegos/snake`; cualquier enlace externo a la anterior dejará de funcionar (`notFound()`). | Aceptado, mismo criterio que las specs 05/07/08: el proyecto está en etapa inicial sin usuarios reales ni enlaces externos que preservar. |
| El `long` del catálogo seguirá diciendo "buscando núcleos magenta" mientras el juego real muestra frutas y usa acento verde: incoherencia visible en la página de detalle. | Aceptado y registrado como fuera de alcance (spec futura de copy); mismo criterio de "no reescribir copy existente" que Asteroids/Tetris/Arkanoid. |

## Qué NO incluye esta spec

- Atajos de teclado `P`/`Esc` (pausa) y `R` (reiniciar) — se usan los
  botones de React.
- Controles táctiles/en pantalla para móvil.
- Sonido o música.
- Las filas no pixeladas de `fruits.png` (solo se porta la fila del atlas
  original).
- Reescribir el `long` del catálogo para que hable de frutas.
- Conectar `game.best` a las puntuaciones reales.
- Tests automatizados.

Cada uno de esos, si entra, va en su propia spec.
