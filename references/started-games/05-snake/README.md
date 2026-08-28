# Snake

Juego de Snake en HTML, CSS y JavaScript puro — sin dependencias, cero frameworks.

## Jugar

Abre `index.html` directamente en el navegador. No requiere servidor ni build.

## Controles

| Acción            | Tecla / Input        |
| ----------------- | -------------------- |
| Mover             | ← ↑ ↓ → o W A S D    |
| Pausar / reanudar | P o Escape           |
| Reiniciar         | R (tras Game Over)   |

No se permite girar 180° sobre la dirección en curso.

## Características

- Canvas 800×600 px sobre una rejilla de 32×24 celdas (25 px por celda)
- Serpiente con paso fijo: 130 ms/paso en el nivel 1, bajando 10 ms por nivel hasta un tope de 60 ms/paso
- Comida = una fruta aleatoria del atlas `fruits.png` (fila pixelada), recolocada en una celda libre al comerla
- +10 pts por fruta; cada 5 frutas sube un nivel y con él la velocidad
- Derrota al chocar con una pared o con el propio cuerpo
- Estado `win` ("¡PERFECTO!") si la serpiente llega a ocupar las 768 celdas
- HUD con score, nivel y largo actual
- Overlays de pausa, Game Over y victoria

## Estructura del proyecto

```
index.html   # punto de entrada; carga sprites.js y game.js, y el <canvas> 800×600
game.js      # toda la lógica (estado, input, paso fijo, colisiones, render, HUD, overlays)
sprites.js   # window.SPRITE_ATLAS: rutas y recortes { x, y, w, h } de las frutas en fruits.png
fruits.png   # spritesheet de frutas (3790×442, fondo transparente)
```

## Estado del juego (en `game.js`)

```js
gameState   // 'playing' | 'paused' | 'gameover' | 'win'
score       // number
level       // number (inicia en 1; sube cada 5 frutas)
fruitsEaten // number
snake       // [{ x, y }] en coordenadas de celda; snake[0] es la cabeza
dir         // { x, y } dirección consolidada
nextDir     // { x, y } dirección encolada para el próximo paso
food        // { x, y, key }  (key = nombre de fruta en SPRITE_ATLAS.fruits)
```

## Origen de los assets

`fruits.png` y `sprites.js` provienen de
`references/source-assets/snake-assets/`. `sprites.js` documenta el
spritesheet original (Google Snake, spriters-resource) y sólo usa la fila
central pixelada (`y = 136–295`).
