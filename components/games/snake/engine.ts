// Motor de Snake portado de references/started-games/05-snake/game.js.
// Única desviación deliberada: la curva de velocidad se bajó respecto al
// original (ver STEP_BASE / STEP_MIN abajo).
// El tablero y la serpiente se dibujan con formas de canvas; la fruta se
// dibuja con su recorte de public/games/snake/fruits.png (FRUIT_ATLAS).
// El HUD y los overlays (pausa / fin / perfecto) los renderiza React, no
// el canvas.

import { FRUIT_ATLAS, FRUIT_KEYS, FRUIT_SHEET_SRC } from "./sprites";

const CELL = 25;
const CANVAS_W = 800;
const CANVAS_H = 600;
const COLS = CANVAS_W / CELL; // 32
const ROWS = CANVAS_H / CELL; // 24

// Curva de velocidad "suave" (más lenta que el juego de referencia, que
// arrancaba en 130 ms con piso de 60): la serpiente avanza más despacio de
// base y sigue acelerando un escalón por nivel.
const STEP_BASE = 170; // ms por paso en el nivel 1
const STEP_MIN = 80; // ms por paso mínimo (tope de velocidad)
const STEP_DECAY = 10; // ms menos por cada nivel
const FRUITS_PER_LEVEL = 5;
const POINTS_PER_FRUIT = 10;
const DT_CLAMP = 100; // ms — igual que el original de Snake

type Vec = { x: number; y: number };
type Cell = { x: number; y: number };
type Food = { x: number; y: number; key: string };

export type EngineSnapshot = {
  score: number;
  level: number; // 1, 2, 3, ... = ⌊frutas comidas / 5⌋ + 1
  length: number; // nº de segmentos de la serpiente (inicia en 3)
  state: "playing" | "gameover" | "win";
};

export type SnakeEngine = {
  start(): void;
  pause(): void;
  resume(): void;
  forceGameOver(): void; // usado por el botón FIN
  destroy(): void; // cancela rAF y quita listeners de teclado
  onChange(cb: (snapshot: EngineSnapshot) => void): () => void;
};

const isOpposite = (a: Vec, b: Vec) => a.x === -b.x && a.y === -b.y;

export function createEngine(canvas: HTMLCanvasElement): SnakeEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");

  // ── Estado ─────────────────────────────────────────────────────────────
  let snake: Cell[] = [];
  let dir: Vec = { x: 1, y: 0 }; // dirección en curso
  let nextDir: Vec = { x: 1, y: 0 }; // dirección encolada para el próximo paso
  let food: Food = { x: 0, y: 0, key: FRUIT_KEYS[0] };
  let score = 0;
  let fruitsEaten = 0;
  let level = 1;
  let state: EngineSnapshot["state"] = "playing";
  let stepAcc = 0; // acumulador de tiempo (ms) para el paso fijo

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let running = false;

  // Carga de fruits.png antes de arrancar el loop (mismo patrón que el
  // loadSpritesheet(cb) del juego de referencia).
  const fruitsImg = new Image();
  let imgReady = false;
  let startPending = false;
  fruitsImg.onload = () => {
    imgReady = true;
    draw();
    if (startPending) {
      startPending = false;
      running = true;
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    }
  };
  fruitsImg.src = FRUIT_SHEET_SRC;

  const listeners = new Set<(snapshot: EngineSnapshot) => void>();

  function emit() {
    const snapshot: EngineSnapshot = {
      score,
      level,
      length: snake.length,
      state,
    };
    listeners.forEach((cb) => cb(snapshot));
  }

  // ── Lógica ─────────────────────────────────────────────────────────────
  function reset() {
    snake = [
      { x: 8, y: 12 },
      { x: 7, y: 12 },
      { x: 6, y: 12 },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    fruitsEaten = 0;
    level = 1;
    state = "playing";
    stepAcc = 0;
    lastTime = null;
    spawnFood();
  }

  function stepInterval() {
    return Math.max(STEP_MIN, STEP_BASE - (level - 1) * STEP_DECAY);
  }

  function cellFree(x: number, y: number) {
    return !snake.some((s) => s.x === x && s.y === y);
  }

  function spawnFood() {
    let x: number, y: number;
    do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
    } while (!cellFree(x, y));
    const key = FRUIT_KEYS[Math.floor(Math.random() * FRUIT_KEYS.length)];
    food = { x, y, key };
  }

  function tick() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Choque con las paredes (sin wrap-around).
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      state = "gameover";
      return;
    }

    // Choque con el cuerpo. Si no crece, la cola libera su celda este paso,
    // así que se la excluye de la comprobación.
    const willGrow = head.x === food.x && head.y === food.y;
    const body = willGrow ? snake : snake.slice(0, -1);
    if (body.some((s) => s.x === head.x && s.y === head.y)) {
      state = "gameover";
      return;
    }

    snake.unshift(head);

    if (willGrow) {
      score += POINTS_PER_FRUIT;
      fruitsEaten++;
      level = Math.floor(fruitsEaten / FRUITS_PER_LEVEL) + 1;
      if (snake.length === COLS * ROWS) {
        state = "win";
        return;
      }
      spawnFood();
    } else {
      snake.pop();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function drawBoard() {
    if (!ctx) return;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#0f2f18" : "#0c2714";
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  function drawFruit(f: Food) {
    if (!ctx) return;
    if (!fruitsImg.complete || !fruitsImg.naturalWidth) return;
    const spr = FRUIT_ATLAS[f.key];
    const box = CELL - 4;
    const scale = Math.min(box / spr.w, box / spr.h);
    const dw = spr.w * scale;
    const dh = spr.h * scale;
    const dx = f.x * CELL + (CELL - dw) / 2;
    const dy = f.y * CELL + (CELL - dh) / 2;
    ctx.drawImage(fruitsImg, spr.x, spr.y, spr.w, spr.h, dx, dy, dw, dh);
  }

  function drawSnake() {
    if (!ctx) return;
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      ctx.fillStyle = i === 0 ? "#c6ff4d" : "#7bd93a";
      ctx.beginPath();
      ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 5);
      ctx.fill();
    }
    // Ojo en la cabeza, desplazado según la dirección.
    const h = snake[0];
    const cx = h.x * CELL + CELL / 2 + dir.x * 4;
    const cy = h.y * CELL + CELL / 2 + dir.y * 4;
    ctx.fillStyle = "#0c2714";
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    if (!ctx) return;
    drawBoard();
    drawFruit(food);
    if (snake.length) drawSnake();
  }

  // ── Bucle con paso fijo ────────────────────────────────────────────────
  function loop(ts: number) {
    if (!running) return;
    if (lastTime === null) lastTime = ts;
    const dt = Math.min(ts - lastTime, DT_CLAMP);
    lastTime = ts;

    if (state === "playing") {
      stepAcc += dt;
      while (stepAcc >= stepInterval()) {
        stepAcc -= stepInterval();
        tick();
        if (state !== "playing") break;
      }
    }

    draw();
    emit();

    if (state === "playing") {
      rafId = requestAnimationFrame(loop);
    } else {
      running = false;
      rafId = null;
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    const k = e.key;
    let nd: Vec | null = null;
    if (k === "ArrowUp" || k === "w" || k === "W") nd = { x: 0, y: -1 };
    else if (k === "ArrowDown" || k === "s" || k === "S") nd = { x: 0, y: 1 };
    else if (k === "ArrowLeft" || k === "a" || k === "A") nd = { x: -1, y: 0 };
    else if (k === "ArrowRight" || k === "d" || k === "D") nd = { x: 1, y: 0 };

    if (nd) {
      e.preventDefault();
      // Se valida contra `dir` (la dirección ya consolidada): así el próximo
      // paso nunca puede ser una reversa de 180°, por muchas teclas que se
      // pulsen entre un paso y el siguiente.
      if (!isOpposite(nd, dir)) nextDir = nd;
    }
  }

  window.addEventListener("keydown", onKeyDown);

  // ── API pública ────────────────────────────────────────────────────────
  function start() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    reset();
    draw();
    emit();
    if (imgReady) {
      running = true;
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    } else {
      startPending = true;
    }
  }

  function pause() {
    running = false;
    startPending = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function resume() {
    if (running || state !== "playing") return;
    if (!imgReady) {
      startPending = true;
      return;
    }
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function forceGameOver() {
    if (state !== "playing") return;
    state = "gameover";
    pause();
    draw();
    emit();
  }

  function destroy() {
    pause();
    window.removeEventListener("keydown", onKeyDown);
    fruitsImg.onload = null;
    listeners.clear();
  }

  function onChange(cb: (snapshot: EngineSnapshot) => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }

  return { start, pause, resume, forceGameOver, destroy, onChange };
}
