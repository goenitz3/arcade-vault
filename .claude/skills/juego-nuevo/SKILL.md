---
name: juego-nuevo
description: Diseña una spec para portar un juego de references/started-games/ a un componente jugable propio con leaderboard real en Supabase, integrado al catálogo de Arcade Vault. No escribe código, solo la spec. Úsala cuando quieras añadir un juego real nuevo (además de Asteroids) a la plataforma.
disable-model-invocation: true
argument-hint: '<carpeta-en-references/started-games, ej. tetris o 03-tetris>'
---

# /juego-nuevo — Diseñador de spec para portar un juego con leaderboard

Esta skill es una variante especializada de `/spec` (misma filosofía y
mismas reglas duras) para un solo tipo de feature: portar uno de los juegos
de referencia en `references/started-games/` a un componente jugable propio
de Arcade Vault, con motor real, HUD, guardado de puntuación en Supabase, y
aparición en el catálogo (`/games`, `/juegos/[id]`, `/salon`).

**No escribes código aquí.** Tu trabajo es entender el juego de referencia
elegido, hacer las preguntas necesarias, y producir `specs/0N-<slug>.md` con
la misma estructura que ya usaron `specs/05-asteroids-game.md` y
`specs/06-leaderboard-y-catalogo-supabase.md`. La implementación real ocurre
después, en `/juego-nuevo-impl`, una vez la spec esté `Aprobado`.

## Philosophy

Ya se portó un juego a mano dos veces (Asteroids: motor propio en spec 05,
leaderboard real en spec 06). Esta skill existe para que portar el
**segundo** juego (y los siguientes) no obligue a re-derivar ese mismo
patrón desde cero cada vez, ni a razonar de nuevo qué partes del código hoy
están hardcodeadas a `"asteroids"`. El patrón de motor, el contrato de
`EngineSnapshot`, y la lista de infraestructura a generalizar ya están
resueltos abajo — tu trabajo es aplicarlos al juego concreto que el usuario
elija, no reinventarlos.

Responde siempre en el mismo idioma en el que te invocaron. Si el prompt
inicial está en español, responde en español.

## Regla dura de origen

**Solo aceptas juegos que vivan dentro de `references/started-games/<carpeta>`.**
No aceptes rutas externas al repo, ni código pegado directamente por el
usuario, ni una carpeta que no exista bajo `references/started-games/`. Si
el usuario insiste en portar algo de otro origen, dile que esta skill está
limitada a `references/started-games/` y que tendría que agregarse ahí
primero.

## Fase 1 — Contexto y elección del juego

1. Lista el contenido de `references/started-games/` (`ls`).
2. Lista el contenido de `specs/` para ver qué juegos ya tienen spec escrita
   (busca en los headers/objetivos qué carpeta de referencia portó cada
   spec existente — spec 05 portó `02-asteroids`, por ejemplo).
3. Calcula qué carpetas de `references/started-games/` **no** tienen spec
   todavía — esos son los candidatos disponibles.

Si `$ARGUMENTS` viene vacío: muestra la lista de candidatos disponibles y
pide al usuario elegir uno. Si no hay ningún candidato disponible (todos ya
tienen spec), dile eso explícitamente y pregunta si quiere de todas formas
portar una variante distinta de uno ya existente (caso raro, confírmalo
antes de seguir).

Si `$ARGUMENTS` trae un valor: intenta resolverlo contra las carpetas reales
de `references/started-games/` (el usuario puede escribir el nombre
completo `03-tetris`, solo el slug `tetris`, o solo el número `03`). Si no
encuentras coincidencia, muestra las carpetas disponibles y pide corregir —
no asumas.

Si la carpeta elegida **ya tiene spec** en `specs/`, dile al usuario el
nombre de esa spec existente y pregunta si de verdad quiere crear una spec
adicional para el mismo juego (puede ser una segunda vuelta con más
alcance) antes de continuar.

## Fase 1.5 — Leer el juego de referencia

Dentro de la carpeta elegida, lee todo lo que exista de esta lista:
`game.js`, `index.html`, `style.css`, `README.md`, `CLAUDE.md`, y cualquier
otro `.js` que `game.js`/`index.html` importen (p. ej. `levels.js` en
Arkanoid). Ignora tooling que no sea parte del juego en sí (`.claude/`,
`.agents/`, `skills-lock.json`, `specs/` internas de la carpeta de
referencia, `.github/workflows`).

De esa lectura, identifica:

- Mecánica central y condición de derrota/fin de partida.
- Qué constituye "puntuación", "vidas o intentos" y "nivel/oleada" (o sus
  equivalentes) en este juego — no todos los juegos tienen las tres cosas
  literalmente; adapta.
- Controles de teclado exactos.
- Tamaño/relación de aspecto del canvas y constantes de física relevantes.
- Cualquier mecánica opcional/secundaria candidata a quedar fuera de
  alcance en una primera versión (como spec 05 dejó fuera el power-up de
  disparo triple de Asteroids).
- Si el juego trae assets binarios (spritesheets, sonidos — como Arkanoid),
  identifícalos y su carpeta (`assets/`), para que la spec decida si se
  portan tal cual o se dejan fuera de alcance.

## Fase 2 — Clarificar con preguntas

Igual que `/spec`: preguntas en bloques de 3 a 5, concretas, con opciones
cuando aplique, esperando respuesta antes de continuar. Cubre estas
categorías (adaptadas a este dominio, no genéricas):

1. **Catálogo.** Título del juego, `short`/`long` (copy del catálogo),
   categoría (una de `ARCADE`, `PUZZLE`, `SHOOTER`, `VERSUS` — son las
   únicas válidas por el `check` de la tabla `games`), color de acento (uno
   de `cyan`, `magenta`, `yellow`, `green` — mismo motivo), slug de portada
   (`cover-<slug>` en `app/globals.css`), valores decorativos `best`/`plays`
   iniciales (igual que los demás juegos, no calculados de datos reales).
2. **Alcance reducido.** De las mecánicas identificadas en la Fase 1.5,
   cuáles se portan tal cual y cuáles quedan fuera para una spec futura.
   Si el juego trae assets binarios (sonido, sprites), pregunta
   explícitamente si entran en esta spec o quedan fuera (precedente: spec
   05 no incluyó sonido).
3. **Snapshot del motor.** Qué campos concretos tendrá el `EngineSnapshot`
   de este juego (equivalente a `score/lives/level/state` de Asteroids,
   adaptado — p. ej. Tetris podría no tener "vidas" sino "líneas
   despejadas"). Confirma también los valores posibles de `state`
   (mínimo: `"playing" | "gameover"`, más los intermedios que el juego
   necesite, como `"dead"` en Asteroids para la reaparición con
   invencibilidad).
4. **Generalización de infraestructura (solo si aplica).** Antes de
   preguntar, verifica el estado actual del código:
   - Lee `lib/scores-supabase.ts` y `lib/scores-supabase-server.ts`: ¿siguen
     con `ASTEROIDS_GAME_ID`/`saveAsteroidsScore`/`topAsteroidsScores`
     hardcodeados a un solo juego, o ya aceptan `gameId` como parámetro?
   - Lee `app/juegos/[id]/jugar/page.tsx` y `app/juegos/[id]/page.tsx`:
     ¿siguen decidiendo con `if (game.id === "asteroids")`, o ya existe un
     registro genérico de motores por id?
   - Lee `components/SalonHallOfFame.tsx`/`app/salon/page.tsx`: ¿sigue el
     `ASTEROIDS_ID` hardcodeado, o ya es genérico?

   Si **cualquiera** de esos tres puntos sigue hardcodeado a un solo juego,
   informa al usuario: "Esta es la primera spec que porta un juego con
   motor propio distinto de Asteroids. La spec incluirá, como sus primeros
   pasos, generalizar [lista los puntos concretos que encontraste
   hardcodeados] para que soporten múltiples juegos con motor propio.
   ¿De acuerdo?" y espera confirmación antes de seguir. Si el usuario no
   está de acuerdo, pregunta si prefiere dejar esa generalización para otra
   spec previa y limitar esta a documentar la dependencia como riesgo/bloqueo.

   Si los tres puntos **ya son genéricos** (alguien ya hizo esa
   generalización antes), sáltate esta pregunta y dilo explícitamente: la
   spec no necesita esos pasos.

**Cuándo parar de preguntar:** igual criterio que `/spec` — cuando puedas
responder sin asumir nada: qué archivos van a aparecer o cambiar, cuál es el
primer y el último paso ejecutable, y cómo se verifica que el juego quedó
terminado.

## Fase 3 — Redactar la spec sección por sección

Sigue **literalmente** `.claude/skills/spec/template.md` (mismo archivo que
usa `/spec`) para la forma de cada sección. Muestra cada sección, pregunta
si se queda así o hay ajustes, y solo avanza a la siguiente tras
confirmación — nunca generes la spec completa de un tirón.

Orden y contenido esperado, usando `specs/05-asteroids-game.md` y
`specs/06-leaderboard-y-catalogo-supabase.md` como referencia de nivel de
detalle:

1. **Header** (Estado `Draft`, Depende de las specs relevantes —
   normalmente 05 y 06 por el patrón de motor y Supabase—, fecha, objetivo
   en una sola frase).
2. **Alcance** (dentro/fuera, explícito). Incluye en "dentro" el renombrado
   de catálogo si aplica, el motor portado, HUD, botones PAUSA/FIN/SALIR,
   modal de fin de juego con guardado real, y el cableado de rutas. Incluye
   en "fuera" todo lo que la Fase 2 dejó fuera de alcance.
3. **Modelo de datos**: el contrato `EngineSnapshot`/`Engine` específico de
   este juego (mismo formato que el bloque `ts` de spec 05), y el `INSERT`
   semilla del juego nuevo en la tabla `games` (mismo formato que el seed de
   spec 06, respetando los `check` de `cat`/`color`).
4. **Plan de implementación**: pasos numerados, cada uno dejando la app
   compilando y navegable, con verificación manual. Si la Fase 2 detectó
   que falta generalizar infraestructura, esos van **primero** como pasos
   propios (p. ej.: "Parametrizar `lib/scores-supabase(-server).ts` con
   `gameId`", "Reemplazar los `if (game.id === ...)` por un registro de
   motores en las páginas afectadas"), antes de los pasos de portado del
   juego concreto (motor → componente → HUD/botones → modal y guardado →
   cableado de rutas → limpieza al desmontar → seed en `games` → clase CSS
   `.cover-<slug>`).
5. **Criterios de aceptación**: checklist booleano, agrupado igual que spec
   05/06 (General / Catálogo / Juego jugable / Guardado de puntuación /
   Aislamiento de otros juegos / Limpieza de recursos), adaptado a este
   juego.
6. **Decisiones tomadas y descartadas**: registra en particular las
   decisiones de alcance reducido y la decisión sobre generalizar o no la
   infraestructura, con su motivo.
7. **Riesgos** (si aplica): incluye como riesgo conocido cualquier
   comportamiento no probado del refactor de generalización sobre Asteroids
   (que no debe cambiar de comportamiento), si esta spec lo incluye.

## Fase 4 — Guardar

Mismo procedimiento que `/spec`:

1. Numeración siguiente según lo que exista en `specs/`.
2. Slug corto derivado del objetivo (normalmente el nombre del juego, p.
   ej. `tetris`, `arkanoid`).
3. Confirma el nombre de archivo propuesto (`specs/0N-<slug>.md`) con el
   usuario antes de escribirlo.
4. Crea el archivo con todas las secciones aprobadas. Estado inicial
   `Draft` — nunca lo marques `Aprobado` automáticamente.
5. Confirma al usuario: ruta del archivo creado, recordatorio de que está
   en `Draft` y debe pasar a `Aprobado` manualmente tras releerlo, y que el
   siguiente paso es `/juego-nuevo-impl 0N-<slug>` una vez aprobado.
   **Detente ahí.** No propongas implementar, ni escribir código, ni tomar
   ninguna acción más allá de esa confirmación.

## Reglas duras

- **Nunca escribas código durante esta skill.** Solo el `.md` de la spec al
  final.
- **Nunca propongas implementar la spec después de guardarla.** Tu trabajo
  termina al escribir el archivo. El usuario corre `/juego-nuevo-impl`
  cuando esté listo.
- **Nunca asumas decisiones que el usuario no confirmó.** Si falta
  información, pregunta.
- **Nunca generes la spec completa en una sola respuesta.** Sección por
  sección, con confirmación.
- **Nunca aceptes un origen fuera de `references/started-games/`.**
- Si el juego elegido ya tiene una spec existente y el usuario decide seguir
  de todas formas, dilo explícitamente en el header ("Depende de" debe
  listar esa spec anterior).

## Argumentos

Si te invocaron como `/juego-nuevo tetris` (o `03-tetris`), resuelve ese
valor contra `references/started-games/` en la Fase 1 antes de preguntar
nada más. Si te invocaron sin argumento, empieza mostrando los candidatos
disponibles.
