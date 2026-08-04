# SPEC 02 — Landing page y reubicación de la Biblioteca

> **Estado:** Aprovado
> **Depende de:** 01-mvp-pantallas-visuales
> **Fecha:** 2026-08-04
> **Objetivo:** Portar la landing page de `references/templates/home-about/home.jsx` a `/`, moviendo la Biblioteca actual a `/games` y actualizando el Nav para reflejar la nueva estructura.

## Alcance

**Dentro:**

- Nueva landing page en `/`, portada de `home.jsx`: héroe con silhouettes
  flotantes, sección "¿Por qué Arcade Vault?", preview de juegos, estadísticas,
  actividad en vivo / top jugadores, precios y CTA final.
- Reubicar la Biblioteca actual (grid de juegos con buscador y filtros) de `/`
  a `/games`. Todo su comportamiento (búsqueda, chips de categoría, tarjetas)
  se mantiene igual, solo cambia la ruta.
- Actualizar `components/Nav.tsx`: agregar el enlace "Inicio" (→ `/`),
  "Biblioteca" pasa a apuntar a `/games`. El link "Acerca de" del template
  **no** se agrega (ver spec futura).
- Preview de juegos en la landing (6 tarjetas), sección de actividad en vivo
  y top jugadores, alimentados con datos reales: `GAMES` de `lib/games.ts` y
  el generador determinista `seededScores` de `lib/scores.ts`.
- Estadística "N+ JUEGOS" calculada desde `GAMES.length` (hoy 8, no 12 como
  en el template).
- Sección de precios/FAQ replicada tal cual del template (contenido
  decorativo, sin lógica real de pagos).
- Efecto de aparición progresiva al hacer scroll (`useReveal` +
  `IntersectionObserver`, clases `.reveal`/`.in`), como componente reutilizable.
- Migrar a `app/globals.css` las clases CSS de la landing que falten
  (`home-hero`, `home-section`, `feature-card`, `mini-rail`, `home-stats`,
  `home-final`, `.reveal`, silhouettes, ticker/top-list, pricing/FAQ),
  tomadas de `references/templates/home-about/styles.css`.
- Actualizar cualquier enlace interno que hoy apunte a `/` esperando la
  Biblioteca, para que apunte a `/games`.

**Fuera de alcance (para specs futuras):**

- Página "Acerca de" (`about.jsx`) y su formulario de contacto.
- El link "Acerca de" en el Nav.
- Cualquier lógica real de precios/pagos: la sección de precios es
  puramente visual.
- Actividad en vivo en tiempo real: los timestamps ("hace 2 min") son texto
  fijo, no se calculan contra un reloj real.
- Cambios a las pantallas de Detalle, Reproductor, Auth o Salón más allá de
  ajustar enlaces que apuntaban a `/`.
- Tests automatizados.

## Modelo de datos

La landing reutiliza los tipos existentes (`Game`, `ScoreRow`) y extiende `lib/scores.ts` con dos generadores deterministas nuevos, siguiendo el mismo patrón que `detailScores`/`hallScores`.

```ts
// lib/scores.ts

/** Top jugadores del día para la landing: 5 filas, semilla fija. */
export function topPlayersToday(count = 5): ScoreRow[] {
  return seededScores(4242, count);
}

type ActivityRow = {
  player: string;      // reutiliza PLAYERS existente
  game: string;         // Game["title"], no un nombre inventado
  score: number;
  minutesAgo: number;   // "hace N min", texto fijo, no un reloj real
  color: "cyan" | "magenta" | "yellow" | "green";
};

/** Actividad reciente para el ticker de la landing: 7 filas, semilla fija. */
export function recentActivity(count = 7): ActivityRow[];
```

`recentActivity` combina `seededScores(1337, count)` (para `player` y `score`) con `GAMES` ciclado por índice (para `game`) y un arreglo fijo de minutos ascendentes `[2, 5, 8, 12, 18, 24, 31]` ciclado igual. Es puro y determinista: mismo resultado en servidor y cliente, sin `Date.now()`.

El preview de juegos de la landing usa `GAMES.slice(0, 6)` directamente — no necesita tipo nuevo. `topPlayersToday` y `recentActivity` no introducen tipos de dominio nuevos más allá de `ActivityRow`, que vive junto a sus funciones en `lib/scores.ts` (no en `lib/types.ts`, porque es exclusivo de la landing).

No hay cambios de persistencia: nada de esto toca `localStorage`.

## Plan de implementación

Cada paso deja la aplicación compilando y navegable. Verificación manual con `npm run dev`; al cerrar cada paso, `npx tsc --noEmit` y `npm run lint` en verde.

1. **CSS de la landing.** Migrar a `app/globals.css` las clases de
   `references/templates/home-about/styles.css` correspondientes a: HOME PAGE
   (líneas 930–1070: hero, silhouettes, features, mini-rail, stats, final CTA,
   `.reveal`), ACTIVITY (1621–1671: ticker, top-list) y PRICING (1672–1745).
   No se migra la sección ABOUT PAGE (1071–1150): queda fuera de alcance.
   Verificación: las clases existen en `globals.css` y no chocan con nombres
   ya usados (`grep` previo de cada selector nuevo contra el archivo).

2. **Generadores de datos.** Añadir a `lib/scores.ts` `topPlayersToday` y
   `recentActivity` (con el tipo `ActivityRow`), según el modelo de datos.
   Verificación: `topPlayersToday()` y `recentActivity()` devuelven arreglos
   estables entre dos llamadas; `recentActivity()[0].game` es un `Game["title"]`
   real de `GAMES`.

3. **Componente de aparición al scroll.** Crear `components/Reveal.tsx`
   (`"use client"`): envuelve una sección con su propio
   `IntersectionObserver`, agrega clase `in` al entrar en viewport
   (`threshold: 0.12`) y deja de observar tras la primera aparición. Recibe
   `as` (etiqueta, por defecto `"section"`) y `className`.
   Verificación: componente aislado sin errores de consola; no exige que el
   resto de la página sea cliente.

4. **Reubicar la Biblioteca.** Crear `app/games/page.tsx` con el contenido
   actual de `app/page.tsx` (héroe "ARCADE VAULT" + `GameBrowser`), sin
   cambios de comportamiento.
   Verificación: `/games` se ve y funciona exactamente como `/` antes de este
   paso (búsqueda, chips, tarjetas).

5. **Componentes de la landing.** Crear en `components/landing/`:
   - `FloatingSilhouettes.tsx` (servidor): los 8 SVG decorativos del héroe.
   - `FeatureIcon.tsx` (servidor): los 4 íconos pixel de "¿Por qué Arcade
     Vault?".
   - `GamePreviewRail.tsx` (servidor): recibe `games: Game[]`, pinta
     `mini-rail` con `Link` a `/juegos/[id]`.
   - `ActivityFeed.tsx` (servidor): recibe `activity: ActivityRow[]` y
     `topPlayers: ScoreRow[]`, pinta el ticker y la lista de top 5.
   Verificación: cada componente renderiza aislado sin errores de consola.

6. **Página principal.** Reescribir `app/page.tsx` como componente de
   servidor: héroe (sin `Reveal`, visible de inmediato) + secciones
   "¿Por qué Arcade Vault?", preview de juegos, estadísticas, actividad en
   vivo, precios y CTA final, cada una envuelta en `<Reveal>`. Estadística de
   juegos: `` `${GAMES.length}+` ``. CTAs: "EXPLORAR JUEGOS" e "INSERTAR
   MONEDA" → `/games`; "CREAR CUENTA" → `/auth`; "VER SALÓN" → `/salon`.
   Verificación: `/` muestra la landing completa; las secciones aparecen al
   hacer scroll; los 3 CTA navegan a las rutas correctas.

7. **Nav.** Actualizar `components/Nav.tsx`: agregar enlace "Inicio" → `/`
   (activo solo en `pathname === "/"`), "Biblioteca" → `/games` (activo en
   `/games` y `/juegos/*`, como hoy). Replicar en el panel móvil.
   Verificación: en `/` se resalta "Inicio"; en `/games` y en
   `/juegos/caida`, "Biblioteca"; en ninguna otra ruta ambos a la vez.

8. **Redirecciones dependientes de `/`.** Cambiar a `/games`: los botones
   "VOLVER AL VAULT" de `GamePlayer.tsx`, `app/juegos/[id]/page.tsx` y
   `app/salon/page.tsx`; los `router.push` de login/registro e "invitado" en
   `app/auth/page.tsx`. El botón "VOLVER AL VAULT" de `app/not-found.tsx`
   se mantiene en `/`.
   Verificación: terminar una partida y pulsar "VOLVER AL VAULT" lleva a
   `/games`; iniciar sesión o entrar como invitado lleva a `/games`; entrar a
   una ruta inexistente y pulsar el botón de 404 lleva a `/`.

## Criterios de aceptación

### General

- [ ] `npm run build` termina sin errores y `npx tsc --noEmit` no reporta nada.
- [ ] `npm run lint` pasa sin errores ni advertencias.

### Landing (`/`)

- [ ] `/` muestra el héroe con el título en tres líneas, las 8 silhouettes
      flotantes y los dos CTA ("EXPLORAR JUEGOS", "CREAR CUENTA").
- [ ] La sección "¿Por qué Arcade Vault?" muestra las 4 tarjetas de feature.
- [ ] La sección de preview muestra 6 tarjetas de `GAMES` enlazando a
      `/juegos/[id]`; "VER TODOS LOS JUEGOS →" navega a `/games`.
- [ ] La estadística de juegos muestra `${GAMES.length}+` (hoy "8+"), no "12+".
- [ ] El ticker de actividad muestra 7 filas con nombre de jugador, juego
      real (de `GAMES`) y puntaje; el top 5 muestra las filas 1 a 5.
- [ ] "VER SALÓN →" navega a `/salon`.
- [ ] La sección de precios muestra el plan único y las 3 preguntas del FAQ;
      "EMPEZAR GRATIS →" navega a `/auth`.
- [ ] El CTA final "INSERTAR MONEDA →" navega a `/games`.
- [ ] Cada sección debajo del héroe aparece con la animación de scroll (clase
      `in` se agrega al entrar en el viewport) y no antes.
- [ ] No hay advertencias de hidratación en consola al cargar `/`.

### Biblioteca (`/games`)

- [ ] `/games` reproduce exactamente el comportamiento que tenía `/` en la
      spec 01: búsqueda, chips de categoría, tarjetas con tilt 3D, estado
      vacío.
- [ ] `/` ya no muestra el buscador ni la grilla de juegos.

### Nav

- [ ] En `/`, el enlace "Inicio" aparece activo y "Biblioteca" no.
- [ ] En `/games`, `/juegos/caida` y `/juegos/caida/jugar`, "Biblioteca"
      aparece activo y "Inicio" no.
- [ ] El panel lateral móvil muestra "Inicio" y "Biblioteca" con el mismo
      comportamiento de activo/inactivo.

### Redirecciones

- [ ] Guardar puntuación y pulsar "VOLVER AL VAULT" en el Reproductor lleva
      a `/games`.
- [ ] "VOLVER AL VAULT" en Detalle y en el Salón lleva a `/games`.
- [ ] Iniciar sesión, registrarse o entrar como invitado en `/auth` lleva a
      `/games`.
- [ ] "VOLVER AL VAULT" en la pantalla 404 lleva a `/`.

## Decisiones tomadas y descartadas

### Enrutado

- **Sí:** `/` pasa a ser la landing y la Biblioteca se muda a `/games`,
  decisión explícita del usuario. Alinea la estructura con el nav de
  referencia (Inicio ≠ Biblioteca) y con el patrón de marketing-page-luego-
  producto habitual en este tipo de sitios.
- **No:** usar una ruta en español para la Biblioteca (p. ej. `/biblioteca`),
  pese a que el resto de rutas del proyecto son en español (`/juegos`,
  `/salon`, `/auth`). Se respeta la decisión explícita del usuario de usar
  `/games`; queda anotado como inconsistencia de nomenclatura conocida.

### Alcance

- **No:** incluir la página "Acerca de" (`about.jsx`) ni su formulario de
  contacto en esta spec. Es contenido independiente de la landing y merece su
  propia spec con sus propias decisiones (validación, envío simulado, etc.).
- **No:** agregar el enlace "Acerca de" al Nav todavía, porque apuntaría a
  una página que no existe.
- **Sí:** incluir la sección de precios/FAQ tal cual el template, aunque no
  tiene lógica real detrás. Es contenido decorativo consistente con el resto
  del sitio simulado (mismo criterio que la spec 01 con el reproductor).

### Datos

- **Sí:** preview de juegos, ticker de actividad y top jugadores alimentados
  con datos reales (`GAMES`, `seededScores`), no con los literales
  ficticios del template (NEONFOX/Caída/etc. tal cual). Mantiene una sola
  fuente de verdad para el catálogo y es coherente con el patrón ya
  establecido en `lib/scores.ts` por la spec 01.
- **Sí:** `recentActivity` y `topPlayersToday` con semillas fijas
  (`1337` y `4242`), puros y deterministas, para no romper hidratación.
- **Sí:** estadística de juegos calculada desde `GAMES.length` en vez del
  literal "12+" del template, para que no quede desactualizada.
- **No:** timestamps reales en el ticker ("hace N min" calculado contra
  `Date.now()`). Son literales fijos, igual que el resto de datos simulados
  del proyecto; calcularlos de verdad exigiría guardar cuándo se generó cada
  fila.

### UI

- **Sí:** replicar el efecto `reveal`/`IntersectionObserver`, pero encapsulado
  en un componente `Reveal` reutilizable en vez de un hook `useEffect` a nivel
  de página entera. Mantiene el resto de la landing como componentes de
  servidor, siguiendo la convención de la spec 01 ("cliente únicamente donde
  hay estado o eventos").
- **Sí:** redirecciones post-acción mixtas: "volver al vault" y
  login/invitado van a `/games` porque el usuario viene de un contexto de
  juego; el botón de la pantalla 404 va a `/` porque es un punto de entrada
  genérico, no una continuación de una tarea.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Enlaces externos o marcadores de usuarios que apuntaban a `/` esperando la Biblioteca dejan de funcionar como antes. | Es un cambio de producto aceptado explícitamente; no hay redirect de compatibilidad porque el proyecto no tiene usuarios reales todavía. |
| Migrar solo un subconjunto de `styles.css` (HOME PAGE + ACTIVITY + PRICING) deja alguna clase suelta sin migrar y una sección se ve rota. | Cotejar visualmente cada sección contra `references/templates/home-about/home.jsx` renderizado (`arcade-vault-standalone.html`) al cerrar el paso 1 y el paso 6. |
| Múltiples instancias de `Reveal` con su propio `IntersectionObserver` degradan el rendimiento si se agregan muchas secciones a futuro. | Hoy son 5 instancias como máximo; cada una se desconecta tras la primera aparición (`unobserve` + no reconectar). |
| Los redirects mixtos (`/games` vs `/`) generan confusión si a futuro se agregan más pantallas con botones "volver". | Documentado en la sección de decisiones: la regla es "continuación de tarea de juego → `/games`, entrada genérica → `/`". |
| `recentActivity`/`topPlayersToday` con semilla fija muestran siempre la misma "actividad reciente", pudiendo notarse estática si un usuario recarga varias veces. | Aceptado: es una maqueta sin backend, igual que el resto de rankings simulados de la spec 01. |
