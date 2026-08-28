# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Juego de Snake en HTML, CSS y JavaScript puro — sin dependencias, cero frameworks. Se abre directamente en el navegador (`open index.html`).

Esta carpeta es un **juego de referencia** dentro de Arcade Vault: existe para
ser portado a un componente propio con leaderboard mediante la skill
`/juego-nuevo`. No es la implementación de producto.

## Desarrollo

No hay paso de build ni servidor requerido. Para probar cambios: abre `index.html`.

## Arquitectura

| Archivo      | Rol |
|--------------|-----|
| `index.html` | Punto de entrada; carga `sprites.js` y `game.js`, y el `<canvas>` de 800×600 px |
| `game.js`    | Toda la lógica del juego (estado, input, bucle con paso fijo, colisiones, render, HUD, overlays) |
| `sprites.js` | `window.SPRITE_ATLAS`: `sources.fruits` (ruta del PNG) y `fruits.<nombre>` con el recorte `{ x, y, w, h }` de cada fruta |
| `fruits.png` | Spritesheet de frutas (3790×442, fondo transparente). Sólo se usa la fila central pixelada (`y = 136–295`) |

### Mecánica

- Rejilla de `COLS`×`ROWS` = 32×24 celdas de `CELL` = 25 px.
- La serpiente avanza con **paso fijo** acumulando `dt` en `stepAcc`; el
  intervalo por paso es `stepInterval()` = `max(60, 130 − (level−1)·10)` ms.
- `dir` es la dirección consolidada; `nextDir` la encolada. El input valida
  siempre contra `dir`, de modo que un paso nunca puede ser reversa de 180°.
- Comer una fruta: `+10` a `score`, `fruitsEaten++`, `level = ⌊fruitsEaten/5⌋ + 1`,
  y `spawnFood()` en una celda libre con una fruta aleatoria.
- Derrota (`gameState = 'gameover'`) al salir del tablero o al chocar con el
  cuerpo (la cola se excluye si ese paso no hay crecimiento).
- `gameState = 'win'` si `snake.length === COLS*ROWS`.

### Estado del juego (en `game.js`)

```js
gameState   // 'playing' | 'paused' | 'gameover' | 'win'
score       // number
level       // number (inicia en 1)
fruitsEaten // number
snake       // [{ x, y }] en celdas; snake[0] es la cabeza
dir         // { x, y }
nextDir     // { x, y }
food        // { x, y, key }
```

## Assets

`fruits.png` y `sprites.js` se copiaron desde
`references/source-assets/snake-assets/`. La única diferencia respecto al
original es `SPRITE_ATLAS.sources.fruits`, ajustada a `'fruits.png'` (mismo
directorio que `index.html`).
