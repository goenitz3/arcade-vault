// Motor de Tetris portado de references/started-games/03-tetris/game.js.
// Versión reducida: sin la pieza "N" (tuerca), no estándar (fuera de alcance de la spec).

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

export type PieceShape = number[][];

export const COLORS: readonly string[] = [
  "", // 0 = vacío, sin uso
  "#4dd0e1", // I
  "#ffd54f", // O
  "#ba68c8", // T
  "#81c784", // S
  "#e57373", // Z
  "#90caf9", // J
  "#ffb74d", // L
];

const PIECES: PieceShape[] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

export type EngineSnapshot = {
  score: number;
  lines: number;
  level: number;
  nextPiece: PieceShape;
  state: "playing" | "gameover";
};

export type TetrisEngine = {
  start(): void;
  pause(): void;
  resume(): void;
  forceGameOver(): void;
  destroy(): void;
  onChange(cb: (snapshot: EngineSnapshot) => void): () => void;
};

type Piece = { type: number; shape: PieceShape; x: number; y: number };

export function createEngine(canvas: HTMLCanvasElement): TetrisEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");

  let board: number[][] = [];
  let current: Piece;
  let next: Piece;
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = 1000;
  let dropAccum = 0;
  let state: EngineSnapshot["state"] = "playing";

  const listeners = new Set<(snapshot: EngineSnapshot) => void>();

  function emit() {
    listeners.forEach((cb) => cb({ score, lines, level, nextPiece: next.shape, state }));
  }

  function createBoard(): number[][] {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  function randomPiece(): Piece {
    const type = Math.floor(Math.random() * 7) + 1;
    const shape = PIECES[type].map((row) => [...row]);
    return {
      type,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  function collide(shape: PieceShape, ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function rotateCW(shape: PieceShape): PieceShape {
    const rows = shape.length;
    const cols = shape[0].length;
    const result: PieceShape = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c]) board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) endGame();
  }

  function endGame() {
    state = "gameover";
    pause();
    emit();
  }

  function drawBlock(x: number, y: number, colorIndex: number, size: number, alpha = 1) {
    if (!colorIndex || !ctx) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS[colorIndex];
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    ctx.globalAlpha = 1;
  }

  function drawGrid() {
    if (!ctx) return;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = "#1a1a25";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(c, r, board[r][c], BLOCK);

    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c]) drawBlock(current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c]) drawBlock(current.x + c, current.y + r, current.shape[r][c], BLOCK);
  }

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let running = false;

  function loop(ts: number) {
    if (!running) return;
    const dt = lastTime === null ? 0 : ts - lastTime;
    lastTime = ts;
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
    if (state === "gameover") return;
    draw();
    emit();
    rafId = requestAnimationFrame(loop);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!running || state === "gameover") return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        e.preventDefault();
        hardDrop();
        break;
      default:
        return;
    }
    draw();
    emit();
  }

  window.addEventListener("keydown", onKeyDown);

  function init() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    dropAccum = 0;
    state = "playing";
    next = randomPiece();
    spawn();
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
    if (running || state === "gameover") return;
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function forceGameOver() {
    if (state === "gameover") return;
    endGame();
  }

  function destroy() {
    pause();
    window.removeEventListener("keydown", onKeyDown);
    listeners.clear();
  }

  function onChange(cb: (snapshot: EngineSnapshot) => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  return { start, pause, resume, forceGameOver, destroy, onChange };
}
