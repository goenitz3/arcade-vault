# SPEC 05 — Juego jugable de Asteroids

> **Estado:** Implementado
> **Depende de:** 02-landing-page
> **Fecha:** 2026-08-14
> **Objetivo:** Portar el juego de referencia `references/02-asteroids/game.js` a un componente React aislado y jugable con teclado en `/juegos/asteroids/jugar`, reemplazando la maqueta de puntaje falso del catálogo por una versión real con vidas, niveles y guardado de puntuación.

## Alcance

**Dentro:**

- Renombrar en `lib/games.ts` la entrada del catálogo `id: "rocas"` a
  `id: "asteroids"`, `title: "ASTEROIDS"` y `cover: "cover-asteroids"`
  (mismo `short`/`long`/`cat`/`color`/`best`/`plays`, sin cambios de copy).
- Renombrar en `app/globals.css` la clase `.cover-rocas` a `.cover-asteroids`.
- Nuevo componente cliente `components/games/asteroids/AsteroidsGame.tsx`,
  que porta a TypeScript la lógica de
  `references/02-asteroids/game.js`: clases `Bullet`, `Asteroid`, `Ship`,
  `Particle`, spawn/split de asteroides, colisiones, niveles con dificultad
  creciente, 3 vidas con invencibilidad temporal al reaparecer, y el loop
  `requestAnimationFrame` con `dt` capado a 50ms.
- Canvas fijo de 800×600 (mismas coordenadas y constantes de física que el
  original), escalado visualmente por CSS dentro de `.crt-screen`.
- Controles de teclado idénticos al original: `←`/`→` rotar, `↑` propulsar,
  `Espacio` disparar.
- **HUD doble mostrando los mismos valores en tiempo real:** se conserva
  `drawHUD()` dentro del canvas (score, nivel, vidas — igual que el
  original), y además el HUD de React fuera del canvas (Jugador,
  Puntuación, Vidas, Nivel) se alimenta del mismo estado real del motor vía
  callback, no del `setInterval` falso de `GamePlayer.tsx`. Ambos se
  actualizan en cada frame/cambio de estado y nunca muestran valores
  distintos entre sí.
- Botones propios PAUSA/FIN/SALIR: PAUSA cancela el
  `requestAnimationFrame` sin perder el estado del juego; FIN fuerza
  `lives = 0` y dispara el mismo camino de game over que perder por
  colisión; SALIR navega a `/juegos/asteroids`.
- Modal de "FIN DEL JUEGO" con el mismo flujo que `GamePlayer.tsx`: input
  de nombre editable, botón "GUARDAR PUNTUACIÓN" que llama a
  `useSession().saveScore({ game: "asteroids", score, name })`, toast
  "PUNTUACIÓN GUARDADA", y acciones "JUGAR DE NUEVO" / "VOLVER AL VAULT".
  Se reutiliza el marco visual `.crt`/`.crt-screen`/`.crt-bottom` y
  `.modal-bd` ya existentes en `globals.css`.
- Cableado en `app/juegos/[id]/jugar/page.tsx`: cuando
  `id === "asteroids"` se renderiza `<AsteroidsGame game={game} />`; para
  cualquier otro id se sigue renderizando `<GamePlayer game={game} />`
  exactamente como hoy.
- Limpieza correcta del loop y los listeners de teclado al desmontar el
  componente (navegar a SALIR o cambiar de ruta durante la partida).

**Fuera de alcance (para specs futuras):**

- El power-up de disparo triple (clase `PowerUp`, `tripleShot`,
  `POWERUP_DROP_CHANCE`, indicador "3x") del juego de referencia: esta
  versión usa la mecánica reducida (sin power-ups).
- Controles táctiles/en pantalla para móvil. El juego funciona solo con
  teclado en esta spec, aunque la etiqueta genérica "TECLADO / TÁCTIL" de
  la página de detalle no cambia (es igual para los 8 juegos y no es
  específica de Asteroids).
- Cualquier cambio a `GamePlayer.tsx` o a los otros 7 juegos del catálogo:
  siguen usando la maqueta de puntaje falso exactamente como hoy.
- Conectar `game.best` (41200, dato decorativo) a las puntuaciones reales
  guardadas por el jugador.
- Sonido/música.
- Tabla de puntuaciones (`Leaderboard`) alimentada con partidas reales de
  Asteroids en `/juegos/asteroids`: sigue usando `detailScores` simulado
  como los demás juegos.
- Tests automatizados.

## Modelo de datos

No se introducen tipos de dominio nuevos en `lib/types.ts` (reutiliza
`Game` y `SavedScore` ya existentes). Sí define el contrato interno del
motor portado y cómo se comunica con React.

```ts
// components/games/asteroids/engine.ts

export type EngineSnapshot = {
  score: number;
  lives: number;   // 0..3
  level: number;   // 1, 2, 3, ...
  state: "playing" | "dead" | "gameover";
};

export type AsteroidsEngine = {
  start(): void;
  pause(): void;
  resume(): void;
  forceGameOver(): void;   // usado por el botón FIN
  destroy(): void;         // cancela rAF y quita listeners de teclado
  onChange(cb: (snapshot: EngineSnapshot) => void): () => void;
};
```

- El motor se inicializa contra un `HTMLCanvasElement` fijo (800×600) y
  corre su propio `requestAnimationFrame`; `AsteroidsGame.tsx` no reimplementa
  el loop, solo lo orquesta.
- `onChange` se dispara una vez por frame con el snapshot actual
  (`score`/`lives`/`level`/`state`); el HUD de React se suscribe a este
  callback para pintar los mismos valores que ya se dibujan dentro del
  canvas. Ambos HUD leen del mismo `EngineSnapshot`, así que nunca pueden
  desincronizarse.
- Cuando `state` pasa a `"gameover"` (por perder la última vida o por
  `forceGameOver()`), `AsteroidsGame.tsx` abre el modal existente y llama a
  `useSession().saveScore({ game: "asteroids", score, name })` al confirmar,
  reusando el tipo `SavedScore` ya definido en `lib/types.ts`.
- `lib/games.ts` solo cambia valores de campos existentes en el `Game` con
  `id: "asteroids"` (no se añade ningún campo nuevo al tipo `Game`).

## Plan de implementación

Cada paso deja la aplicación compilando y navegable. Verificación manual
con `npm run dev`; al cerrar cada paso, `npx tsc --noEmit` y `npm run lint`
en verde.

1. **Renombrar el juego en el catálogo.** En `lib/games.ts`, cambiar
   `id: "rocas"` → `id: "asteroids"`, `title: "ROCAS"` → `"ASTEROIDS"`,
   `cover: "cover-rocas"` → `"cover-asteroids"`. En `app/globals.css`,
   renombrar el selector `.cover-rocas` a `.cover-asteroids`.
   Verificación: `/games` y `/juegos/asteroids` muestran la tarjeta con el
   nuevo nombre y la portada se sigue viendo igual; no quedan referencias a
   `rocas` en `lib/games.ts` ni `app/globals.css`.

2. **Motor del juego portado a TypeScript.** Crear
   `components/games/asteroids/engine.ts`: clases `Bullet`, `Asteroid`,
   `Ship`, `Particle` (sin `PowerUp`/`tripleShot`), funciones
   `spawnAsteroids`, `initGame`, `nextLevel`, `explode`, `killShip`,
   `update(dt)`, `draw(ctx)`, siguiendo 1:1 la lógica de
   `references/02-asteroids/game.js` pero con `drawHUD()` conservado (dibuja
   score/nivel/vidas en el canvas). Exponer una función
   `createEngine(canvas): AsteroidsEngine` según el modelo de datos, que
   encapsula el estado (`ship`, `bullets`, `asteroids`, `particles`, `score`,
   `lives`, `level`, `state`) y el loop `requestAnimationFrame`.
   Verificación: `npx tsc --noEmit` sin errores; probado de forma aislada
   (ej. montado temporalmente en una página), el canvas dibuja la nave y los
   asteroides y responde a `←`/`→`/`↑`/Espacio.

3. **Componente `AsteroidsGame.tsx`.** Crear
   `components/games/asteroids/AsteroidsGame.tsx` (`"use client"`): monta el
   `<canvas width={800} height={600}>` escalado por CSS dentro de
   `.crt`/`.crt-screen`/`.crt-bottom`, llama a `createEngine` en un efecto,
   se suscribe a `onChange` para reflejar `score`/`lives`/`level` en el HUD
   de React, y llama a `destroy()` en el cleanup del efecto.
   Verificación: navegar a `/juegos/asteroids/jugar` (aún sin cablear en el
   paso 4, se prueba montando el componente directamente) muestra el juego
   jugable con el HUD de React y el HUD del canvas mostrando los mismos
   valores en todo momento.

4. **HUD, PAUSA/FIN/SALIR.** Agregar a `AsteroidsGame.tsx` el HUD superior
   (Jugador, Puntuación, Vidas, Nivel) y los botones PAUSA (llama a
   `pause()`/`resume()` del motor), FIN (`forceGameOver()`) y SALIR
   (`Link` a `/juegos/asteroids`).
   Verificación: PAUSA congela el juego (nave/asteroides dejan de moverse)
   y REANUDAR continúa desde el mismo estado; FIN abre el modal de game
   over inmediatamente.

5. **Modal de fin de juego y guardado de puntuación.** Agregar a
   `AsteroidsGame.tsx` el modal "FIN DEL JUEGO" (mismo markup/clases que
   `GamePlayer.tsx`: `.modal-bd`, `.modal`, input de nombre, botón "GUARDAR
   PUNTUACIÓN", toast, "JUGAR DE NUEVO"/"VOLVER AL VAULT"), llamando a
   `useSession().saveScore({ game: "asteroids", score, name })`.
   Verificación: perder las 3 vidas (o pulsar FIN) abre el modal con el
   score real; "GUARDAR PUNTUACIÓN" persiste en `localStorage`
   (`av_scores`) y muestra el toast; "JUGAR DE NUEVO" reinicia una partida
   nueva sin recargar la página.

6. **Cablear la ruta.** En `app/juegos/[id]/jugar/page.tsx`, renderizar
   `<AsteroidsGame game={game} />` cuando `id === "asteroids"` y
   `<GamePlayer game={game} />` para el resto, sin tocar
   `generateStaticParams`/`generateMetadata`.
   Verificación: `/juegos/asteroids/jugar` muestra el juego real; las
   rutas `/juegos/<otro-id>/jugar` de los 7 juegos restantes siguen
   mostrando la maqueta de `GamePlayer.tsx` sin cambios.

7. **Limpieza al desmontar.** Confirmar que salir de la página (SALIR,
   navegación del navegador, cambio de pestaña) cancela el
   `requestAnimationFrame` y remueve los listeners de teclado del motor
   (dentro de `destroy()`), sin fugas de memoria ni errores en consola.
   Verificación: entrar y salir varias veces de `/juegos/asteroids/jugar`
   sin que la consola muestre errores ni que el juego siga corriendo en
   segundo plano tras salir.

## Criterios de aceptación

### General

- [ ] `npm run build` termina sin errores y `npx tsc --noEmit` no reporta nada.
- [ ] `npm run lint` pasa sin errores ni advertencias.
- [ ] No queda ninguna referencia a `rocas`/`cover-rocas` en `lib/games.ts`
      ni `app/globals.css`.

### Catálogo

- [ ] `/games` muestra la tarjeta "ASTEROIDS" (antes "ROCAS") con la misma
      portada, categoría, `best` y `plays` que tenía "ROCAS".
- [ ] `/juegos/asteroids` (página de detalle) carga sin errores y su botón
      "▶ JUGAR AHORA" navega a `/juegos/asteroids/jugar`.

### Juego jugable

- [ ] `/juegos/asteroids/jugar` renderiza `AsteroidsGame`, no `GamePlayer`.
- [ ] `←`/`→` rotan la nave, `↑` la propulsa, `Espacio` dispara balas.
- [ ] Los asteroides grandes se dividen en medianos y estos en pequeños al
      ser destruidos; los pequeños desaparecen sin dividirse.
- [ ] El HUD del canvas y el HUD de React muestran siempre el mismo valor
      de puntuación, vidas y nivel entre sí, actualizados en tiempo real.
- [ ] Al chocar con un asteroide sin invencibilidad activa, se pierde una
      vida y la nave reaparece en el centro con parpadeo de invencibilidad
      temporal.
- [ ] Al perder la última vida, aparece el modal "FIN DEL JUEGO" con el
      puntaje final correcto.
- [ ] Limpiar todos los asteroides de un nivel hace avanzar al siguiente
      nivel (contador de nivel sube y aparecen más asteroides).
- [ ] PAUSA congela el juego (nave y asteroides dejan de moverse) y
      REANUDAR continúa exactamente desde ese mismo estado.
- [ ] FIN abre el modal "FIN DEL JUEGO" de inmediato, sin esperar a perder
      las 3 vidas.
- [ ] SALIR navega a `/juegos/asteroids` sin errores en consola.

### Guardado de puntuación

- [ ] En el modal "FIN DEL JUEGO", escribir un nombre y pulsar "GUARDAR
      PUNTUACIÓN" agrega una entrada a `localStorage` (`av_scores`) con
      `game: "asteroids"` y el `score` real de la partida.
- [ ] Tras guardar, se muestra el toast "PUNTUACIÓN GUARDADA" y el botón de
      guardar desaparece.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva (score en 0, 3 vidas,
      nivel 1) sin recargar la página.

### Aislamiento de otros juegos

- [ ] Los 7 juegos restantes del catálogo siguen usando `GamePlayer.tsx`
      sin ningún cambio de comportamiento (puntaje falso que sube solo,
      HUD y modal idénticos a antes de esta spec).

### Limpieza de recursos

- [ ] Salir de `/juegos/asteroids/jugar` y volver a entrar varias veces no
      genera errores en consola ni dobles loops de animación corriendo en
      simultáneo.

## Decisiones tomadas y descartadas

### Catálogo y ruta

- **Sí:** renombrar la entrada existente `"rocas"` a `"asteroids"` en vez
  de crear una entrada nueva. El juego de referencia ya se llama Asteroids
  y "ROCAS" era el placeholder pensado para este mismo juego
  ("Pulveriza asteroides en gravedad cero"); mantenerlo como entrada
  separada hubiera duplicado el mismo concepto en el catálogo.
- **No:** cambiar el patrón de rutas. Se mantiene `/juegos/[id]/jugar`
  dinámico para los 8 juegos; el aislamiento pedido por el usuario se logra
  a nivel de componente (`AsteroidsGame` vs `GamePlayer`), no de URL.
  Decisión explícita del usuario tras evaluar una ruta estática separada.

### Aislamiento

- **Sí:** componente y motor propios en `components/games/asteroids/`, sin
  tocar ni depender de `GamePlayer.tsx`. Instrucción explícita del usuario
  ("debemos mantener cada juego aislado"): los otros 7 juegos no deben
  verse afectados por esta spec ni acoplarse a una interfaz genérica de
  "motor de juego" todavía inexistente.
- **No:** extraer una interfaz genérica de motor de juego reutilizable
  para futuros juegos reales. Prematuro con un solo juego portado; se
  reevaluará si una spec futura porta un segundo juego y aparece
  duplicación real entre motores.

### HUD

- **Sí:** HUD doble (canvas + React) mostrando los mismos valores en
  tiempo real, ambos alimentados por el mismo `EngineSnapshot`. Decisión
  explícita del usuario tras la primera propuesta (solo HUD de React); al
  compartir la misma fuente de verdad, no hay riesgo de que se
  desincronicen.
- **No:** que el HUD de React lea el DOM del canvas o viceversa. Ambos se
  suscriben al mismo callback `onChange` del motor, evitando dos fuentes de
  verdad independientes.

### Mecánica del juego

- **Sí:** portar el motor completo del original (niveles, vidas,
  invencibilidad temporal, partículas, división de asteroides) excepto el
  power-up de disparo triple. Decisión explícita del usuario: versión
  reducida sin `PowerUp`/`tripleShot` para esta primera spec.
- **No:** controles táctiles/en pantalla. El original es solo teclado;
  agregarlos ahora amplía el alcance sin necesidad confirmada de soporte
  móvil real todavía.

### Canvas

- **Sí:** canvas fijo 800×600 con las mismas constantes de física que el
  original, escalado por CSS. Evita reescribir velocidades/radios/spawns a
  coordenadas relativas y preserva el balance ya probado del juego de
  referencia.
- **No:** canvas que se redimensiona dinámicamente según el contenedor.
  Mayor riesgo de romper la sensación de juego original a cambio de nitidez
  extra en pantallas grandes, sin que se haya pedido explícitamente.

### Pausa, fin y guardado

- **Sí:** PAUSA cancela el `requestAnimationFrame` sin resetear estado, y
  FIN fuerza `lives = 0` para reutilizar el mismo camino de game over que
  perder por colisión, en vez de tener dos flujos de "fin de partida"
  distintos.
- **Sí:** reutilizar el flujo de guardado de puntuación de `GamePlayer.tsx`
  (mismo modal, mismo `saveScore`) tal cual, para consistencia visual con
  el resto del catálogo aunque el componente en sí sea independiente.
- **No:** conectar `game.best` del catálogo a las puntuaciones reales
  guardadas. Ningún otro juego del catálogo lo hace hoy; se deja fuera para
  no introducir una inconsistencia de alcance entre juegos.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El canvas fijo 800×600 escalado por CSS puede verse borroso o con letras del HUD pixeladas en pantallas muy anchas dentro de `.crt-screen` (que es responsivo). | Aceptado: es la misma limitación que tendría cualquier canvas de resolución fija; se documenta como decisión explícita en vez de complicar la física con coordenadas relativas. |
| Si `destroy()` no cancela correctamente el `requestAnimationFrame` o los listeners de `keydown`/`keyup` al desmontar, el juego seguiría corriendo en segundo plano o dejaría listeners duplicados al reentrar a la ruta. | Cubierto explícitamente en el paso 7 del plan y en criterios de aceptación ("Limpieza de recursos"); se verifica entrando/saliendo varias veces de la ruta. |
| Mostrar el mismo dato en dos HUD (canvas + React) alimentados por el mismo snapshot podría desincronizarse si en el futuro alguien agrega un segundo punto de escritura de estado. | Mitigado por diseño: ambos HUD leen únicamente de `EngineSnapshot` vía `onChange`; no hay estado paralelo que pueda divergir mientras se respete ese contrato. |
| Renombrar `"rocas"` a `"asteroids"` cambia la URL pública `/juegos/rocas` → `/juegos/asteroids`; cualquier enlace externo o marcador guardado a la ruta anterior dejará de funcionar (`notFound()`). | Aceptado: el proyecto está en etapa inicial sin usuarios reales ni enlaces externos que preservar, según el estado actual del repositorio. |
