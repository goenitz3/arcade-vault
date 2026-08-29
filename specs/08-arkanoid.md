# SPEC 08 — Juego jugable de Arkanoid

> **Estado:** Implementado
> **Depende de:** 05-asteroids-game, 06-leaderboard-y-catalogo-supabase, 07-tetris
> **Fecha:** 2026-08-27
> **Objetivo:** Portar el juego de referencia `references/started-games/04-arkanoid/game.js` a un componente jugable real en `/juegos/arkanoid/jugar`, renombrando el placeholder `"bloque-buster"` del catálogo a `"arkanoid"` y conectando su leaderboard real a Supabase vía la infraestructura ya generalizada en la spec 07.

## Alcance

**Dentro:**

- Renombrar en la fila de Supabase (tabla `games`) `id: "bloque-buster"` →
  `id: "arkanoid"`, `title: "ARKANOID"`, `cover: "cover-arkanoid"` (se
  conservan `short`/`long`/`cat: "ARCADE"`/`color: "cyan"`/`best: 28450`/
  `plays: "12.4K"` tal cual, sin cambios de copy).
- Migración SQL nueva `supabase/migrations/0003_rename_bloque_buster_to_arkanoid.sql`
  con los `UPDATE` de `games`/`scores`.
- Renombrar en `app/globals.css` el selector `.cover-bricks` a `.cover-arkanoid`.
- Nuevo componente cliente `components/games/arkanoid/ArkanoidGame.tsx` y
  motor `components/games/arkanoid/engine.ts`, que porta a TypeScript la
  lógica de `references/started-games/04-arkanoid/game.js`: paddle, bola,
  colisiones AABB contra muros/paddle/bloques, 5 niveles (mismos patrones
  de bloques y multiplicadores de velocidad `×1.00`..`×1.46` que el
  original vía `levels.js`), 3 vidas, puntuación `+10` por bloque,
  animación de explosión al romper un bloque (redibujada vectorialmente,
  no con el spritesheet original), y los estados `playing`/`gameover`/`win`.
- Canvas fijo de 800×600 (mismas coordenadas y constantes de física que el
  original), escalado visualmente por CSS dentro de `.crt-screen`, igual
  patrón que Asteroids y Tetris.
- Controles: `←`/`→` y movimiento del mouse sobre el canvas mueven el
  paddle (único juego del catálogo con control mixto teclado+mouse, igual
  que el original).
- HUD de React (Jugador, Puntuación, Vidas, Nivel) alimentado por
  `EngineSnapshot` vía `onChange`, mismo patrón que Asteroids/Tetris.
- Botones propios PAUSA/FIN/SALIR con el mismo comportamiento que
  Asteroids/Tetris: PAUSA cancela el loop sin perder estado; FIN fuerza
  `state = "gameover"` inmediatamente; SALIR navega a `/juegos/arkanoid`.
  Además, mientras está en pausa se muestran 5 botones de React ("1".."5")
  que saltan al nivel elegido (`jumpToLevel(n)`), reemplazando el overlay
  dentro del canvas del original.
- Modal de fin de juego con el mismo flujo que `AsteroidsGame.tsx`/
  `TetrisGame.tsx`: input de nombre editable, botón "GUARDAR PUNTUACIÓN"
  que llama a `saveScore({ gameId: "arkanoid", playerName, score })`, toast
  "PUNTUACIÓN GUARDADA", y acciones "JUGAR DE NUEVO" / "VOLVER AL VAULT".
  El título del modal es "FIN DEL JUEGO" cuando `state === "gameover"` y
  "¡COMPLETASTE EL JUEGO!" cuando `state === "win"`; ambos casos reutilizan
  el mismo flujo de guardado.
- Registrar `"arkanoid"` en `lib/games-with-engine.ts` (`GAMES_WITH_ENGINE`)
  y en `components/games/engine-registry.tsx` (`ENGINE_COMPONENTS`).
- Leaderboard real de Arkanoid en `/salon` (pestaña ARKANOID) y en
  `/juegos/arkanoid` vía `topScores("arkanoid", …)`, con el mismo estado
  vacío ("Aún sin puntuaciones") que ya usan Asteroids y Tetris.
- Limpieza correcta del loop y de los listeners (teclado y mouse) al
  desmontar `ArkanoidGame.tsx`.

**Fuera de alcance (para specs futuras):**

- Sonido/efectos de audio (`ball-bounce.mp3`, `break-sound.mp3`): mismo
  precedente que Asteroids y Tetris, ninguno de los dos tiene sonido.
- El spritesheet real del original (`assets/spritesheet-breakout.png`) y
  su animación de explosión de 4 frames basada en imagen: se redibuja todo
  vectorialmente (rects de color), consistente con cómo dibujan Asteroids
  y Tetris. Sería el primer juego del catálogo con assets binarios si se
  portara tal cual, y no se pidió explícitamente.
- El overlay de selección de nivel dibujado dentro del canvas con listener
  de click sobre el propio canvas: se reemplaza por botones de React fuera
  del canvas, igual que el resto de controles interactivos de
  Asteroids/Tetris.
- Controles táctiles/en pantalla para móvil (igual decisión que las specs
  05 y 07).
- Conectar `game.best` (28450, dato decorativo heredado de "bloque-buster")
  a las puntuaciones reales guardadas.
- Tests automatizados.

## Modelo de datos

No se agregan campos nuevos a `Game`, `ScoreRow` ni `ScoreRecord` en
`lib/types.ts` (siguen sirviendo tal cual). Sí define el contrato interno
del motor portado y cómo se comunica con React.

```ts
// components/games/arkanoid/engine.ts

export type EngineSnapshot = {
  score: number;
  lives: number;   // 0..3
  level: number;    // 1..5
  state: "playing" | "gameover" | "win";
};

export type ArkanoidEngine = {
  start(): void;
  pause(): void;
  resume(): void;
  forceGameOver(): void;         // usado por el botón FIN
  jumpToLevel(n: number): void;  // 1..5, solo tiene efecto mientras está en pausa
  destroy(): void;               // cancela rAF y quita listeners de teclado/mouse
  onChange(cb: (snapshot: EngineSnapshot) => void): () => void;
};

export function createEngine(canvas: HTMLCanvasElement): ArkanoidEngine;
```

- El motor se inicializa contra un único `<canvas width={800} height={600}>`
  y corre su propio `requestAnimationFrame`; `ArkanoidGame.tsx` no
  reimplementa el loop, solo lo orquesta (mismo patrón que
  `AsteroidsGame.tsx`/`TetrisGame.tsx`).
- `onChange` se dispara una vez por frame con el snapshot actual; el HUD
  de React se alimenta únicamente de este snapshot, sin leer el DOM del
  canvas.
- Completar el nivel 5 (limpiar todos sus bloques) hace pasar `state` a
  `"win"` directamente, sin pasar por `"gameover"`.

### Seed de catálogo

```sql
update public.games
set id = 'arkanoid', title = 'ARKANOID', cover = 'cover-arkanoid'
where id = 'bloque-buster';

update public.scores
set game_id = 'arkanoid'
where game_id = 'bloque-buster';
```

- Migración nueva `supabase/migrations/0003_rename_bloque_buster_to_arkanoid.sql`
  (no se editan las migraciones `0001`/`0002` ya aplicadas). El `UPDATE`
  sobre `scores` es defensivo, igual criterio que la migración `0002` de
  la spec 07.

## Plan de implementación

Cada paso deja la aplicación compilando y navegable. Verificación manual
con `npm run dev`; al cerrar cada paso, `npx tsc --noEmit` y `npm run lint`
en verde.

1. **Migración SQL: renombrar el placeholder en el catálogo.** Crear
   `supabase/migrations/0003_rename_bloque_buster_to_arkanoid.sql` con los
   `UPDATE` de `games`/`scores` del modelo de datos. Aplicarla al proyecto
   Supabase. En `app/globals.css`, renombrar `.cover-bricks` a
   `.cover-arkanoid`.
   Verificación: `select * from games where id = 'arkanoid'` devuelve la
   fila con `title: 'ARKANOID'`, `cover: 'cover-arkanoid'`; ya no existe
   `id: 'bloque-buster'`. `/games` y `/juegos/arkanoid` muestran la
   tarjeta "ARKANOID" con la portada correcta.

2. **Motor de Arkanoid portado a TypeScript.** Crear
   `components/games/arkanoid/engine.ts`: paddle, bola, colisiones AABB
   contra muros/paddle/bloques, 5 niveles con patrones y multiplicadores de
   velocidad idénticos a `references/started-games/04-arkanoid/levels.js`,
   3 vidas, puntuación `+10` por bloque, animación de explosión vectorial,
   estados `playing`/`gameover`/`win`, `jumpToLevel`. Exponer
   `createEngine(canvas): ArkanoidEngine` según el modelo de datos.
   Verificación: `npx tsc --noEmit` sin errores; probado de forma aislada
   (montado temporalmente en una página), el canvas dibuja paddle/bola/
   bloques y responde a `←`/`→`.

3. **Componente `ArkanoidGame.tsx` (base).** Crear
   `components/games/arkanoid/ArkanoidGame.tsx` (`"use client"`): monta el
   `<canvas width={800} height={600}>` escalado por CSS dentro de
   `.crt`/`.crt-screen`/`.crt-bottom`, llama a `createEngine` en un efecto,
   se suscribe a `onChange`, y llama a `destroy()` en el cleanup.
   Verificación: montado directamente (aún sin cablear en el paso 7), el
   juego es jugable end-to-end con teclado.

4. **Control por mouse.** Agregar el listener `mousemove` sobre el canvas
   que mueve el paddle, con el mismo cálculo de escala (`getBoundingClientRect`
   + `scaleX`) que usa el original.
   Verificación: mover el mouse sobre el canvas desplaza el paddle
   igual que `←`/`→`, sin conflicto entre ambos controles.

5. **HUD, selector de nivel y PAUSA/FIN/SALIR.** Agregar el HUD superior
   (Jugador, Puntuación, Vidas, Nivel), los botones PAUSA
   (`pause()`/`resume()`), FIN (`forceGameOver()`) y SALIR (`Link` a
   `/juegos/arkanoid`), y los 5 botones de salto de nivel visibles solo
   mientras está en pausa (`jumpToLevel(n)`).
   Verificación: PAUSA congela el juego (paddle/bola dejan de moverse) y
   REANUDAR continúa desde el mismo estado; pulsar un botón de nivel salta
   a ese nivel; FIN abre el modal de game over inmediatamente.

6. **Modal de fin de juego y guardado.** Agregar el modal "FIN DEL JUEGO"
   / "¡COMPLETASTE EL JUEGO!" (mismo markup que
   `AsteroidsGame.tsx`/`TetrisGame.tsx`: input de nombre, botón "GUARDAR
   PUNTUACIÓN", toast, "JUGAR DE NUEVO"/"VOLVER AL VAULT"), llamando a
   `saveScore({ gameId: "arkanoid", playerName: name, score })`.
   Verificación: perder las 3 vidas abre el modal "FIN DEL JUEGO"; limpiar
   el nivel 5 abre el modal "¡COMPLETASTE EL JUEGO!"; ambos con el score
   real. "GUARDAR PUNTUACIÓN" inserta la fila en Supabase y muestra el
   toast; "JUGAR DE NUEVO" reinicia sin recargar.

7. **Registro de motores y cableado de ruta.** Agregar `"arkanoid"` a
   `GAMES_WITH_ENGINE` en `lib/games-with-engine.ts` y a
   `ENGINE_COMPONENTS` en `components/games/engine-registry.tsx`.
   Verificación: `/juegos/arkanoid/jugar` renderiza `ArkanoidGame`;
   `/juegos/arkanoid` y `/salon` (pestaña ARKANOID) muestran el estado
   "Aún sin puntuaciones" hasta que se guarde la primera partida real; el
   resto de juegos no cambia de comportamiento.

8. **Limpieza al desmontar.** Confirmar que salir de
   `/juegos/arkanoid/jugar` (SALIR, navegación, cambio de pestaña) cancela
   el `requestAnimationFrame` y remueve los listeners de teclado y mouse,
   sin fugas de memoria ni errores en consola.
   Verificación: entrar y salir varias veces de `/juegos/arkanoid/jugar`
   sin errores en consola ni loops de animación duplicados corriendo en
   segundo plano.

## Criterios de aceptación

### General

- [ ] `npm run build` termina sin errores y `npx tsc --noEmit` no reporta nada.
- [ ] `npm run lint` pasa sin errores ni advertencias.
- [ ] No queda ninguna referencia a `bloque-buster`/`cover-bricks` en el código.

### Catálogo

- [ ] `/games` muestra la tarjeta "ARKANOID" (antes "BLOQUE BUSTER") con la
      misma portada, categoría `ARCADE`, `best` y `plays` que tenía
      "BLOQUE BUSTER".
- [ ] `/juegos/arkanoid` (página de detalle) carga sin errores y su botón
      "▶ JUGAR AHORA" navega a `/juegos/arkanoid/jugar`.

### Juego jugable

- [ ] `/juegos/arkanoid/jugar` renderiza `ArkanoidGame`, no `GamePlayer`.
- [ ] `←`/`→` y el movimiento del mouse sobre el canvas mueven el paddle.
- [ ] La bola rebota correctamente contra los muros laterales/superior, el
      paddle y los bloques.
- [ ] Romper un bloque suma exactamente 10 puntos y muestra la animación
      de explosión vectorial.
- [ ] Perder la bola (cae por debajo del paddle) resta una vida y
      reposiciona la bola sobre el paddle; al llegar a 0 vidas, `state`
      pasa a `"gameover"`.
- [ ] Limpiar todos los bloques de un nivel avanza al siguiente nivel con
      el patrón y la velocidad de bola correspondientes.
- [ ] Completar el nivel 5 hace pasar `state` a `"win"` (no `"gameover"`).
- [ ] PAUSA congela el juego (paddle y bola dejan de moverse) y REANUDAR
      continúa exactamente desde ese mismo estado; mientras está en pausa
      se muestran los 5 botones de salto de nivel.
- [ ] Pulsar un botón de nivel (1-5) durante la pausa salta a ese nivel.
- [ ] FIN abre el modal "FIN DEL JUEGO" de inmediato, sin esperar a perder
      las 3 vidas.
- [ ] SALIR navega a `/juegos/arkanoid` sin errores en consola.

### Guardado de puntuación

- [ ] En el modal de fin de juego, escribir un nombre y pulsar "GUARDAR
      PUNTUACIÓN" inserta una fila real en la tabla `scores` de Supabase
      con `game_id: "arkanoid"` y el `score` real de la partida.
- [ ] Tras guardar, se muestra el toast "PUNTUACIÓN GUARDADA" y el botón de
      guardar desaparece.
- [ ] Esa puntuación aparece en `/salon` (pestaña ARKANOID) y en el panel
      `Leaderboard` de `/juegos/arkanoid`, ordenada de mayor a menor.
- [ ] Antes de guardar ninguna puntuación, `/salon` (pestaña ARKANOID) y
      `/juegos/arkanoid` muestran el estado "Aún sin puntuaciones" en vez
      de datos simulados o un error.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva (score en 0, 3 vidas,
      nivel 1) sin recargar la página.

### Aislamiento de otros juegos

- [ ] Asteroids y Tetris siguen funcionando exactamente igual que antes de
      esta spec (guardado, lectura de leaderboard, motor jugable), sin
      regresiones de comportamiento.
- [ ] Los 5 juegos restantes del catálogo (sin motor propio) siguen usando
      `GamePlayer.tsx` y `hallScores`/`detailScores` simulados sin ningún
      cambio de comportamiento.
- [ ] Ningún estado ni componente compartido entre `ArkanoidGame.tsx` y
      `AsteroidsGame.tsx`/`TetrisGame.tsx` más allá de la infraestructura
      genérica (`saveScore`/`topScores`/`GAMES_WITH_ENGINE`/
      `ENGINE_COMPONENTS`).

### Limpieza de recursos

- [ ] Salir de `/juegos/arkanoid/jugar` y volver a entrar varias veces no
      genera errores en consola ni dobles loops de animación corriendo en
      simultáneo.

## Decisiones tomadas y descartadas

### Catálogo

- **Sí:** renombrar la entrada existente `"bloque-buster"` a `"arkanoid"`
  en vez de crear una fila nueva. Mismo precedente que
  `"rocas"` → `"asteroids"` (spec 05) y `"caida"` → `"tetris"` (spec 07);
  `"bloque-buster"` ya era el placeholder pensado para este mismo juego
  ("Rebota la pelota y destruye muros de neón").
- **Sí:** conservar tal cual el `short`/`long`/`cat`/`color`/`best`/`plays`
  ya sembrados de `"bloque-buster"`. Mismo criterio que Asteroids y Tetris:
  no se reescribe copy/datos decorativos existentes salvo pedido explícito.

### Render

- **Sí:** redibujar paddle/bola/bloques/explosiones vectorialmente en vez
  de portar el spritesheet real (`assets/spritesheet-breakout.png`).
  Decisión explícita del usuario: consistencia con Asteroids y Tetris, que
  dibujan todo con formas de canvas; evita ser el primer juego del
  catálogo con assets binarios.
- **No:** portar `assets/spritesheet.js` y `assets/spritesheet-breakout.png`
  a `public/`. Queda documentado como fuera de alcance para una spec
  futura si se decide dar más fidelidad visual al original.

### Controles

- **Sí:** portar tanto `←`/`→` como el control por mouse del original.
  Decisión explícita del usuario, distinta del precedente solo-teclado de
  Asteroids/Tetris — es el único juego de referencia con control mixto.
- **No:** controles táctiles/en pantalla. Mismo criterio que Asteroids y
  Tetris; no se pidió soporte móvil real todavía.

### Selector de nivel

- **Sí:** reemplazar el overlay de pausa dibujado dentro del canvas
  (activado por click sobre el propio canvas) por 5 botones de React
  fuera del canvas (`jumpToLevel(n)`). Decisión explícita del usuario:
  mantiene el patrón "nada interactivo dentro del canvas salvo el juego
  mismo" que ya siguen Asteroids y Tetris, en vez de introducir un
  segundo modelo de interacción (click sobre canvas) solo para este
  juego.
- **No:** mantener el listener de `click` sobre el canvas para el
  selector de nivel del original.

### Estado de victoria

- **Sí:** modelar `"win"` como un tercer valor de `state`, distinto de
  `"gameover"`, con su propio título de modal
  ("¡COMPLETASTE EL JUEGO!"). Preserva la distinción que ya tiene el
  juego de referencia entre derrota y victoria, reutilizando el mismo
  modal y flujo de guardado para ambos casos.
- **No:** colapsar `"win"` en `"gameover"`. Habría perdido información
  visible para el jugador sin necesidad, ya que el modal y el guardado se
  reutilizan de todas formas.

### Sonido

- **Sí:** dejar el sonido fuera de alcance. Mismo precedente que Asteroids
  y Tetris — ninguno de los dos juegos con motor propio tiene audio en
  Arcade Vault todavía.

### Infraestructura

- **No:** modificar `lib/scores-supabase(-server).ts`,
  `app/juegos/[id]/page.tsx`, `app/juegos/[id]/jugar/page.tsx` ni
  `SalonHallOfFame.tsx`/`app/salon/page.tsx`. La spec 07 ya los
  generalizó por completo (`saveScore`/`topScores` parametrizados por
  `gameId`, `GAMES_WITH_ENGINE` y `ENGINE_COMPONENTS` como única fuente de
  verdad); esta spec solo agrega la entrada `"arkanoid"` a esas dos listas.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El listener de `mousemove` sobre un canvas fijo escalado por CSS puede calcular mal la posición si `.crt-screen` cambia de tamaño responsivamente, desalineando el paddle respecto al cursor. | Cubierto en el paso 4 del plan: se replica el mismo cálculo de escala (`getBoundingClientRect` + `scaleX`) que ya usa el juego de referencia; se verifica manualmente moviendo el mouse sobre el canvas. |
| Redibujar vectorial en vez de con sprites cambia la apariencia visual respecto al juego de referencia (bloques como rects planos en vez de sprites con textura/bordes). | Aceptado: decisión explícita del usuario priorizando consistencia visual con el resto del catálogo (Asteroids/Tetris) sobre fidelidad 1:1 con el original. |
| Renombrar `"bloque-buster"` a `"arkanoid"` cambia la URL pública `/juegos/bloque-buster` → `/juegos/arkanoid`; cualquier enlace externo a la anterior dejará de funcionar (`notFound()`). | Aceptado, mismo criterio que las specs 05 y 07: el proyecto está en etapa inicial sin usuarios reales que preservar. |
| Si `jumpToLevel(n)` no reinicia correctamente la posición de la bola/paddle o dispara colisiones falsas al saltar de nivel en pausa, podría dejar el juego en un estado inconsistente. | Cubierto en el paso 5 del plan y en criterios de aceptación ("Pulsar un botón de nivel... salta a ese nivel"); se verifica manualmente saltando entre varios niveles durante la pausa. |
