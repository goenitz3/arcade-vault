// Motor de Arkanoid portado de references/started-games/04-arkanoid/game.js
// y levels.js. Redibujado vectorialmente (sin el spritesheet original, fuera
// de alcance de la spec).

const CANVAS_W = 800;
const CANVAS_H = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_ROWS = 6;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (CANVAS_W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;
const EXPLOSION_DURATION = 150; // ms

type BlockDef = { col: number; row: number; color: string };
type Level = { speed: number; blocks: BlockDef[] };

const LEVELS: Level[] = (() => {
  const rowColors1 = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
  const rowColors2 = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
  const rowColors4 = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

  const l1: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) l1.push({ col, row, color: rowColors1[row] });

  const l2: BlockDef[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0) l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps4[row].includes(col)) l4.push({ col, row, color: rowColors4[row] });

  const l5: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

type Rect = { x: number; y: number; w: number; h: number };
type Paddle = Rect;
type Ball = Rect & { vx: number; vy: number };
type Block = Rect & { color: string; alive: boolean };
type Explosion = Rect & { color: string; elapsed: number };

export type EngineSnapshot = {
  score: number;
  lives: number;
  level: number;
  state: "playing" | "gameover" | "win";
};

export type ArkanoidEngine = {
  start(): void;
  pause(): void;
  resume(): void;
  forceGameOver(): void;
  jumpToLevel(n: number): void;
  destroy(): void;
  onChange(cb: (snapshot: EngineSnapshot) => void): () => void;
};

export function createEngine(canvas: HTMLCanvasElement): ArkanoidEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");

  const paddle: Paddle = { x: 0, y: 560, w: 81, h: 14 };
  const ball: Ball = { x: 0, y: 0, w: 16, h: 16, vx: BASE_BALL_VX, vy: BASE_BALL_VY };

  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let lives = 3;
  let score = 0;
  let currentLevel = 1;
  let state: EngineSnapshot["state"] = "playing";

  const keys: Record<string, boolean> = { ArrowLeft: false, ArrowRight: false };
  const listeners = new Set<(snapshot: EngineSnapshot) => void>();

  function emit() {
    listeners.forEach((cb) => cb({ score, lives, level: currentLevel, state }));
  }

  function initPaddle() {
    paddle.x = (CANVAS_W - paddle.w) / 2;
  }

  function positionBallOnPaddle(speed: number) {
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number) {
    currentLevel = n;
    const level = LEVELS[n - 1];
    blocks = level.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    positionBallOnPaddle(level.speed);
  }

  function collideAABB(block: Block): boolean {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  function endGame(next: "gameover" | "win") {
    state = next;
    pause();
    emit();
  }

  function update(dt: number) {
    if (state !== "playing") return;

    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight) paddle.x = Math.min(CANVAS_W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.w >= CANVAS_W) {
      ball.x = CANVAS_W - ball.w;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }

    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }

    for (const block of blocks) {
      if (!block.alive) continue;
      if (collideAABB(block)) {
        block.alive = false;
        explosions.push({ x: block.x, y: block.y, w: block.w, h: block.h, color: block.color, elapsed: 0 });
        score += 10;
        ball.vy = -ball.vy;
        if (blocks.every((b) => !b.alive)) {
          if (currentLevel < 5) loadLevel(currentLevel + 1);
          else endGame("win");
        }
        break;
      }
    }

    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    if (ball.y > CANVAS_H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        endGame("gameover");
      } else {
        positionBallOnPaddle(LEVELS[currentLevel - 1].speed);
      }
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    for (const block of blocks) {
      if (!block.alive) continue;
      ctx.fillStyle = block.color;
      ctx.fillRect(block.x, block.y, block.w, block.h);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(block.x + 1, block.y + 1, block.w - 2, block.h - 2);
    }

    for (const exp of explosions) {
      const alpha = Math.max(0, 1 - exp.elapsed / EXPLOSION_DURATION);
      const scale = 1 + (1 - alpha) * 0.4;
      const w = exp.w * scale;
      const h = exp.h * scale;
      const x = exp.x - (w - exp.w) / 2;
      const y = exp.y - (h - exp.h) / 2;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = exp.color;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#e8e8f0";
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(ball.x + ball.w / 2, ball.y + ball.h / 2, ball.w / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let running = false;

  function loop(timestamp: number) {
    if (!running) return;
    const dt = lastTime === null ? 0 : (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    draw();
    emit();

    if (state === "playing") rafId = requestAnimationFrame(loop);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key in keys) keys[e.key] = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    if (e.key in keys) keys[e.key] = false;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function init() {
    lives = 3;
    score = 0;
    state = "playing";
    initPaddle();
    loadLevel(1);
  }

  function start() {
    init();
    running = true;
    lastTime = null;
    draw();
    emit();
    rafId = requestAnimationFrame(loop);
  }

  function pause() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function resume() {
    if (running || state !== "playing") return;
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function forceGameOver() {
    if (state !== "playing") return;
    endGame("gameover");
  }

  function jumpToLevel(n: number) {
    if (running || state !== "playing") return;
    if (n < 1 || n > LEVELS.length) return;
    loadLevel(n);
    draw();
    emit();
  }

  function destroy() {
    pause();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    listeners.clear();
  }

  function onChange(cb: (snapshot: EngineSnapshot) => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  return { start, pause, resume, forceGameOver, jumpToLevel, destroy, onChange };
}
