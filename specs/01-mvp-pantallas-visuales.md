# SPEC 01 — MVP visual: las cinco pantallas de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-08-01
> **Objetivo:** Portar las cinco pantallas maquetadas en `references/templates/` a rutas reales del App Router de Next.js 16, con datos simulados y sin implementar ningún juego.

## Alcance

**Dentro:**

- Seis rutas del App Router: `/` (Biblioteca), `/juegos/[id]` (Detalle),
  `/juegos/[id]/jugar` (Reproductor), `/auth`, `/salon` y `app/not-found.tsx`.
- Barra de navegación compartida en `app/layout.tsx`, con panel lateral móvil,
  contador de créditos y botón de sesión.
- Pie de página compartido en `app/layout.tsx`.
- Datos simulados tipados en `lib/`: catálogo de 8 juegos, categorías y
  generador determinista de rankings.
- Sesión simulada en `localStorage` (`av_user`) mediante un contexto cliente,
  con acciones `login`, `signOut` y `saveScore`.
- Persistencia de puntuaciones en `localStorage` (`av_scores`), escritas desde
  el modal de fin de partida.
- Réplica visual fiel del template: efecto de inclinación 3D en las tarjetas,
  parpadeo del héroe, marco CRT, podio del Salón de la Fama y animaciones de entrada.
- Simulación de partida en el Reproductor: puntaje por intervalo, vidas, nivel,
  pausa y modal de fin.

**Fuera de alcance (para specs futuras):**

- Cualquier juego real. La arena del CRT es decoración animada por CSS.
- Backend, base de datos y autenticación real. Los botones de Google y GitHub
  son inertes.
- Mostrar las puntuaciones guardadas en los rankings de Detalle o Salón:
  esas tablas siempre pintan datos del generador simulado.
- Validación de formularios en `/auth`. Cualquier envío inicia sesión.
- Reglas reales de vidas, niveles y dificultad.
- Tests automatizados. El repo no tiene framework de tests configurado.
- Cambios en `app/globals.css`, salvo añadir clases que el template no cubra.

Notas de alcance heredadas del template y conservadas a propósito:

- Las vidas nunca bajan. En `reproductor.jsx`, `lives` se inicializa en 3 y nada
  lo decrementa; el botón `FIN` termina la partida directamente.
- El contador «CRÉDITOS · 03» es un literal del Nav, no un estado.
- `app/globals.css` ya cubre las clases de las cinco pantallas (979 líneas,
  migradas en el commit `5629cf1`). Si falta alguna, se añade ahí y no en un
  archivo nuevo.

## Modelo de datos

Todo el dato es simulado y vive en `lib/`. No hay red ni base de datos.

### `lib/types.ts`

```ts
type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
type AccentColor = "cyan" | "magenta" | "yellow" | "green";

type Game = {
  id: string;          // slug de la ruta: "bloque-buster"
  title: string;       // "BLOQUE BUSTER"
  short: string;       // una línea, para la tarjeta
  long: string;        // párrafo, para el detalle
  cat: Category;
  cover: string;       // clase CSS de portada: "cover-bricks"
  color: AccentColor;  // acento del botón JUGAR
  best: number;        // mejor puntuación global
  plays: string;       // ya formateado: "12.4K"
};

type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;        // "07/03/2026", formato es-ES
};

type SessionUser = { name: string };   // mayúsculas, máx. 10 caracteres

type SavedScore = {
  game: string;        // Game["id"]
  score: number;
  name: string;
  at: number;          // Date.now() al guardar
};
```

### `lib/games.ts`

`GAMES: Game[]` con los 8 juegos del template, en su orden original, y
`CATS: readonly string[]` = `["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]`.

Los `id` son los slugs de ruta: `bloque-buster`, `caida`, `serpentina`,
`gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`.

Las clases `cover` deben existir en `app/globals.css`: `cover-bricks`,
`cover-tetro`, `cover-snake`, `cover-glot`, `cover-invaders`, `cover-rocas`,
`cover-rana`, `cover-duelo`.

### `lib/scores.ts`

```ts
function seedFromId(id: string): number;              // suma de charCodes
function seededScores(seed: number, count: number): ScoreRow[];
```

`seededScores` es **puro y determinista**: mismo `seed`, mismo resultado en
servidor y en cliente. Usa el generador congruente lineal del template
(`s = (s * 9301 + 49297) % 233280`) y no llama a `Date.now()` ni a `Math.random()`.
Devuelve las filas ordenadas por puntaje descendente y renumeradas desde `rank: 1`.

Semillas por pantalla, derivadas con `seedFromId`:

- Detalle: `seedFromId(id) * 17 + 3`, `count: 10`.
- Salón: `seedFromId(id) * 23 + 7`, `count: 12`.

### Claves de `localStorage`

- `av_user` → `SessionUser | null`.
- `av_scores` → `SavedScore[]`, se añade al final en cada guardado.

Sin versionado de esquema: son datos desechables de una maqueta. Toda lectura va
envuelta en `try/catch` y cae a un valor por defecto si el JSON está corrupto o
`localStorage` no está disponible.

## Plan de implementación

Cada paso deja la aplicación compilando y navegable. Verificación manual con
`npm run dev`; al cerrar cada paso, `npx tsc --noEmit` y `npm run lint` en verde.

1. **Datos del catálogo.** Crear `lib/types.ts` con los tipos de la sección
   anterior y `lib/games.ts` con `GAMES` y `CATS`, portados de
   `references/templates/data.jsx`.
   Verificación: `npx tsc --noEmit` pasa y `GAMES.length === 8`.

2. **Generador de rankings.** Crear `lib/scores.ts` con `seedFromId` y
   `seededScores`.
   Verificación: llamar dos veces con la misma semilla devuelve el mismo
   arreglo, y las semillas de `caida` y `rocas` ya no coinciden.

3. **Contexto de sesión.** Crear `lib/session.tsx` con `"use client"`, exportando
   `SessionProvider` y el hook `useSession` (`user`, `login`, `signOut`,
   `saveScore`). El estado arranca en `null` y `av_user` se lee dentro de un
   `useEffect` para no romper la hidratación.
   Verificación: la app sigue levantando; aún no hay UI que lo consuma.

4. **Nav y pie de página.** Crear `components/Nav.tsx` (cliente: panel móvil,
   enlaces activos con `usePathname`, botón de sesión) y `components/Footer.tsx`.
   Montarlos en `app/layout.tsx` envolviendo `{children}` con `SessionProvider`,
   dentro de `<main className="av-main">`.
   Verificación: la barra aparece en todas las rutas, el panel móvil abre y
   cierra, y el enlace activo se resalta.

5. **Biblioteca.** Crear `components/GameCard.tsx` (cliente, con el efecto de
   inclinación 3D en `onMouseMove`) y `components/GameBrowser.tsx` (cliente:
   buscador, chips de categoría, grilla y el estado vacío «NO HAY RESULTADOS»).
   Reescribir `app/page.tsx` como componente de servidor: héroe estático más
   `<GameBrowser games={GAMES} />`.
   Verificación: buscar «ca» deja solo CAÍDA; el chip PUZZLE filtra a un juego;
   una búsqueda sin resultados muestra el mensaje; la tarjeta lleva a `/juegos/[id]`.

6. **Tabla de puntuaciones.** Crear `components/Leaderboard.tsx` (servidor):
   recibe `ScoreRow[]` y pinta la lista con los estilos `top1`, `top2` y `top3`.
   Verificación: se renderiza aislado sin errores de consola.

7. **Detalle del juego.** Crear `app/juegos/[id]/page.tsx` como componente de
   servidor `async`: resuelve `const { id } = await params`, busca el juego y
   llama a `notFound()` si no existe. Añadir `generateStaticParams` con los 8
   ids y `generateMetadata` para el título de pestaña.
   Verificación: `/juegos/caida` muestra portada, etiquetas, estadísticas y
   ranking de 10 filas; «VOLVER AL VAULT» regresa a `/`.

8. **Pantalla 404.** Crear `app/not-found.tsx` con estética arcade
   («GAME OVER · 404») y un enlace de vuelta a `/`.
   Verificación: `/juegos/no-existe` muestra esa pantalla con el Nav visible.

9. **Reproductor.** Crear `app/juegos/[id]/jugar/page.tsx` (servidor, resuelve
   el juego igual que el paso 7) y `components/GamePlayer.tsx` (cliente): HUD,
   marco CRT con la arena decorativa, pausa, y modal de fin con guardado vía
   `saveScore`. El intervalo se limpia en el `return` del `useEffect`.
   Verificación: el puntaje sube solo; PAUSA lo congela y muestra el overlay;
   FIN abre el modal; guardar escribe en `av_scores`; JUGAR DE NUEVO reinicia a 0.

10. **Autenticación simulada.** Crear `app/auth/page.tsx` (cliente): pestañas de
    inicio y registro, campos controlados, botón de invitado y los sociales
    inertes. Al enviar, `login()` y `router.push("/")`.
    Verificación: entrar con «px_kai» muestra `PX_KAI ▾` en el Nav; recargar la
    página conserva la sesión; pulsar ese botón cierra sesión.

11. **Salón de la Fama.** Crear `app/salon/page.tsx` (cliente): pestañas por
    juego, podio de tres puestos, tabla de 12 filas y la fila «TU MEJOR MARCA»
    visible solo con sesión iniciada.
    Verificación: cambiar de pestaña cambia el ranking; sin sesión la fila
    amarilla no aparece.

El paso 6 va antes que el 7 porque `Leaderboard` lo consumen tanto el Detalle
como el Salón. Los botones de navegación pasan a ser `Link` con la clase `btn`:
mismo aspecto, pero accesibles por teclado y abribles en pestaña nueva.

## Criterios de aceptación

### Navegación y estructura

- [ ] `npm run build` termina sin errores y `npx tsc --noEmit` no reporta nada.
- [ ] `npm run lint` pasa sin errores ni advertencias.
- [ ] Las rutas `/`, `/juegos/caida`, `/juegos/caida/jugar`, `/auth` y `/salon`
      responden con 200 y muestran el Nav y el pie de página.
- [ ] `/juegos/no-existe` muestra la pantalla «GAME OVER · 404».
- [ ] Recargar cualquier ruta profunda directamente en el navegador la renderiza
      sin errores en consola.
- [ ] El enlace «Biblioteca» del Nav aparece activo también en `/juegos/caida` y
      en `/juegos/caida/jugar`.
- [ ] El panel lateral móvil abre con el botón `≡`, cierra al pulsar el fondo y
      cierra al elegir un enlace.

### Biblioteca

- [ ] Se muestran las 8 tarjetas al cargar `/`.
- [ ] Escribir «ser» en el buscador deja únicamente SERPENTINA.
- [ ] El chip VERSUS deja únicamente DUELO PIXEL; el chip TODOS restaura las 8.
- [ ] Buscar «zzzz» muestra el bloque «NO HAY RESULTADOS».
- [ ] El filtro por texto y el de categoría se aplican combinados.
- [ ] Pasar el cursor sobre una tarjeta la inclina, y al salir vuelve a su
      posición original.
- [ ] Pulsar la tarjeta o su botón JUGAR navega a `/juegos/[id]`.

### Detalle

- [ ] El título, el párrafo largo, las partidas y la mejor puntuación
      corresponden al juego de la URL.
- [ ] La mejor puntuación se muestra con separador de miles en formato es-ES
      (`184.220`).
- [ ] El ranking lateral tiene exactamente 10 filas, ordenadas de mayor a menor.
- [ ] Las tres primeras filas llevan los estilos `top1`, `top2` y `top3`.
- [ ] `caida` y `rocas` muestran rankings distintos entre sí.
- [ ] El ranking es idéntico entre el HTML servido y el ya hidratado: no hay
      advertencias de hidratación en consola.
- [ ] «JUGAR AHORA» navega a `/juegos/[id]/jugar`.
- [ ] La pestaña del navegador muestra el título del juego.

### Reproductor

- [ ] El puntaje se incrementa solo, aproximadamente cada 220 ms.
- [ ] PAUSA detiene el incremento y muestra el overlay «EN PAUSA»; REANUDAR lo
      reactiva.
- [ ] El nivel sube al cruzar cada umbral de 2500 puntos.
- [ ] Las vidas se muestran como tres corazones y no cambian durante la partida.
- [ ] FIN abre el modal con la puntuación final formateada.
- [ ] GUARDAR PUNTUACIÓN añade una entrada a `av_scores` en `localStorage` con
      `game`, `score`, `name` y `at`, y sustituye el formulario por
      «PUNTUACIÓN GUARDADA».
- [ ] JUGAR DE NUEVO reinicia puntaje a 0, nivel a 01 y cierra el modal.
- [ ] SALIR vuelve a `/juegos/[id]`.
- [ ] Salir de la pantalla no deja el intervalo corriendo: no hay advertencias
      de actualización de estado tras desmontar.
- [ ] Con sesión iniciada el campo de nombre viene precargado con el usuario;
      sin sesión, con «INVITADO».

### Autenticación

- [ ] La pestaña CREAR CUENTA añade el campo de correo; INICIAR SESIÓN lo quita.
- [ ] Enviar el formulario con «px_kai» redirige a `/` y el Nav muestra `PX_KAI ▾`.
- [ ] Enviar el formulario vacío inicia sesión como `PLAYER1`.
- [ ] Un usuario de más de 10 caracteres se recorta a 10 y se muestra en mayúsculas.
- [ ] Recargar la página mantiene la sesión iniciada.
- [ ] Pulsar el botón de usuario en el Nav cierra la sesión y borra `av_user`.
- [ ] «JUGAR COMO INVITADO» redirige a `/` sin sesión iniciada.
- [ ] Los botones de Google y GitHub no provocan navegación ni errores.

### Salón de la Fama

- [ ] Hay una pestaña por cada uno de los 8 juegos.
- [ ] Cambiar de pestaña cambia el podio y la tabla.
- [ ] El podio muestra los puestos 02, 01 y 03 en ese orden visual, con el
      campeón elevado al centro.
- [ ] La tabla tiene 12 filas numeradas de #01 a #12.
- [ ] Sin sesión, la fila «TU MEJOR MARCA» no se renderiza.
- [ ] Con sesión, esa fila aparece con el nombre del usuario en amarillo.

## Decisiones tomadas y descartadas

### Arquitectura

- **Sí:** rutas reales del App Router, una carpeta por pantalla. Da URLs
  compartibles, permite prerenderizar el Detalle y deja el Nav en un layout
  compartido que no se remonta al navegar.
- **No:** replicar el enrutado por hash de `app.jsx`. Existía solo porque el
  template era un HTML suelto sin servidor; en Next.js sería trabajo extra para
  un resultado peor.
- **Sí:** componentes de servidor por defecto, `"use client"` únicamente donde
  hay estado o eventos (Nav, GameBrowser, GameCard, GamePlayer, Auth, Salón).
- **Sí:** `params` como `Promise` y resuelto con `await`, según
  `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`.
  Esta versión de Next.js difiere de lo memorizado y AGENTS.md obliga a
  consultar la doc local.
- **Sí:** `generateStaticParams` con los 8 ids, para prerenderizar el Detalle en
  el build.

### Datos y estado

- **Sí:** datos simulados tipados en `lib/`, separando catálogo (`games.ts`) de
  generador de rankings (`scores.ts`). Cuando llegue un backend, se sustituye
  `lib/` sin tocar los componentes.
- **No:** servir el mock como JSON desde `public/` con `fetch`. Añadiría estados
  de carga y de error que no aportan nada a una maqueta.
- **Sí:** generador de rankings determinista. Es lo que permite renderizar las
  tablas en el servidor sin desajustes de hidratación.
- **Sí:** semilla derivada de la suma de códigos de carácter del `id`. Con el
  `id.length` del template, tres pares de juegos mostraban rankings idénticos.
- **Sí:** sesión en `localStorage` más contexto de React, leída en `useEffect`.
- **No:** cookies con Server Actions. Es infraestructura de autenticación real
  para un MVP que no autentica a nadie.
- **No:** versionar el esquema de `localStorage`. Son datos desechables; si el
  formato cambia, se descarta lo guardado.

### Alcance visual

- **Sí:** réplica fiel del template, incluidos el tilt 3D, el parpadeo del héroe
  y el marco CRT. La dirección visual ya está resuelta y el CSS ya está migrado;
  rediseñar no aportaría valor.
- **No:** rediseñar con `/frontend-design`, pese a la instrucción general de
  `CLAUDE.md`. Esa regla aplica cuando hay que *decidir* una estética; aquí ya
  viene dada por `references/templates/`.
- **Sí:** conservar la simulación de partida del reproductor. No es un juego:
  es la maqueta animada de la pantalla, y sin ella el modal de fin no es
  alcanzable ni revisable.
- **Sí:** botones de navegación como `Link` con la clase `btn`. Mismo aspecto,
  pero accesibles por teclado y abribles en pestaña nueva.
- **No:** integrar las puntuaciones guardadas en los rankings. Obligaría a que
  Detalle y Salón fueran de cliente y mezclaría datos reales con simulados.
- **No:** validar el formulario de `/auth`. Sin backend, la validación sería
  teatro y añadiría estados de error que diseñar.
- **No:** corregir los problemas de accesibilidad del template en esta spec
  (enlaces sin `href`, botones sin `aria-label`, contraste de `--ink-faint`).
  Quedan registrados para una spec propia.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Desajuste de hidratación al pintar rankings o sesión en el primer render. | `seededScores` es puro y determinista; `av_user` se lee dentro de `useEffect`, nunca en el estado inicial. |
| El intervalo del reproductor sigue vivo tras salir de la pantalla y provoca fugas o avisos en consola. | El `useEffect` devuelve `clearInterval`, y las dependencias incluyen `over` y `paused`. |
| `localStorage` no disponible o con JSON corrupto (modo privado, cuota llena). | Toda lectura y escritura va en `try/catch` con valor por defecto. La maqueta funciona igual, solo deja de recordar. |
| El efecto de inclinación 3D depende de `onMouseMove` y no existe en táctil. | Es puramente decorativo: sin puntero, la tarjeta se queda en su posición base y sigue siendo pulsable. |
| Alguna clase CSS del template no quedó migrada a `app/globals.css` y una pantalla se ve rota. | Cotejar contra `references/templates/styles.css` al cerrar cada paso; si falta algo, se añade a `globals.css` dentro del bloque del tema. |
| Convertir botones en `Link` cambia el aspecto por estilos de `a` heredados. | Se conserva la clase `btn`; revisar visualmente Detalle y Salón contra el template abierto en paralelo. |
| Escribir contra la API de Next.js memorizada en vez de la instalada (16.2.12). | Consultar `node_modules/next/dist/docs/01-app/` antes de tocar routing, `params` o metadata, como exige AGENTS.md. |

## Lo que **no** entra en esta spec

- Ningún juego jugable. La arena del CRT es decoración CSS.
- Backend, base de datos y autenticación real.
- Puntuaciones reales en los rankings de Detalle y Salón.
- Validación de formularios.
- Correcciones de accesibilidad del template.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propia spec.
