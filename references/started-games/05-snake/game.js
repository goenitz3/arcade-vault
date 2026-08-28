const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ── Constantes ───────────────────────────────────────────────────────────
const CELL = 25;
const COLS = canvas.width / CELL;   // 32
const ROWS = canvas.height / CELL;  // 24

const STEP_BASE = 130;   // ms por paso en el nivel 1
const STEP_MIN = 60;     // ms por paso mínimo (tope de velocidad)
const STEP_DECAY = 10;   // ms menos por cada nivel
const FRUITS_PER_LEVEL = 5;
const POINTS_PER_FRUIT = 10;

const FRUIT_KEYS = Object.keys(SPRITE_ATLAS.fruits);
const fruitsImg = new Image();

// ── Estado ───────────────────────────────────────────────────────────────
let snake;        // [{ x, y }] — snake[0] es la cabeza (coordenadas de celda)
let dir;          // { x, y } — dirección en curso
let nextDir;      // { x, y } — dirección encolada para el próximo paso
let food;         // { x, y, key }
let score;
let fruitsEaten;
let level;
let gameState;    // 'playing' | 'paused' | 'gameover' | 'win'
let stepAcc;      // acumulador de tiempo (ms) para el paso fijo
let lastTime;

function reset() {
  snake = [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  fruitsEaten = 0;
  level = 1;
  gameState = 'playing';
  stepAcc = 0;
  lastTime = null;
  spawnFood();
}

function stepInterval() {
  return Math.max(STEP_MIN, STEP_BASE - (level - 1) * STEP_DECAY);
}

function cellFree(x, y) {
  return !snake.some(s => s.x === x && s.y === y);
}

function spawnFood() {
  let x, y;
  do {
    x = Math.floor(Math.random() * COLS);
    y = Math.floor(Math.random() * ROWS);
  } while (!cellFree(x, y));
  const key = FRUIT_KEYS[Math.floor(Math.random() * FRUIT_KEYS.length)];
  food = { x, y, key };
}

const isOpposite = (a, b) => a.x === -b.x && a.y === -b.y;

// ── Input ────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  const k = e.key;
  let nd = null;
  if (k === 'ArrowUp' || k === 'w' || k === 'W') nd = { x: 0, y: -1 };
  else if (k === 'ArrowDown' || k === 's' || k === 'S') nd = { x: 0, y: 1 };
  else if (k === 'ArrowLeft' || k === 'a' || k === 'A') nd = { x: -1, y: 0 };
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') nd = { x: 1, y: 0 };

  if (nd) {
    e.preventDefault();
    // Se valida contra `dir` (la dirección ya consolidada): así el próximo
    // paso nunca puede ser una reversa de 180°, por muchas teclas que se
    // pulsen entre un paso y el siguiente.
    if (!isOpposite(nd, dir)) nextDir = nd;
    return;
  }

  if ((k === 'p' || k === 'P' || k === 'Escape') && (gameState === 'playing' || gameState === 'paused')) {
    gameState = gameState === 'paused' ? 'playing' : 'paused';
  }
  if ((k === 'r' || k === 'R') && (gameState === 'gameover' || gameState === 'win')) {
    reset();
  }
});

// ── Lógica ───────────────────────────────────────────────────────────────
function tick() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Choque con las paredes (sin wrap-around)
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    gameState = 'gameover';
    return;
  }

  // Choque con el cuerpo. Si no crece, la cola libera su celda este paso,
  // así que se la excluye de la comprobación.
  const willGrow = head.x === food.x && head.y === food.y;
  const body = willGrow ? snake : snake.slice(0, -1);
  if (body.some(s => s.x === head.x && s.y === head.y)) {
    gameState = 'gameover';
    return;
  }

  snake.unshift(head);

  if (willGrow) {
    score += POINTS_PER_FRUIT;
    fruitsEaten++;
    level = Math.floor(fruitsEaten / FRUITS_PER_LEVEL) + 1;
    if (snake.length === COLS * ROWS) {
      gameState = 'win';
      return;
    }
    spawnFood();
  } else {
    snake.pop();
  }
}

// ── Render ───────────────────────────────────────────────────────────────
function drawBoard() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#0f2f18' : '#0c2714';
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
}

function drawFruit(f) {
  if (!fruitsImg.complete || !fruitsImg.naturalWidth) return;
  const spr = SPRITE_ATLAS.fruits[f.key];
  const box = CELL - 4;
  const scale = Math.min(box / spr.w, box / spr.h);
  const dw = spr.w * scale;
  const dh = spr.h * scale;
  const dx = f.x * CELL + (CELL - dw) / 2;
  const dy = f.y * CELL + (CELL - dh) / 2;
  ctx.drawImage(fruitsImg, spr.x, spr.y, spr.w, spr.h, dx, dy, dw, dh);
}

function drawSnake() {
  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i];
    ctx.fillStyle = i === 0 ? '#c6ff4d' : '#7bd93a';
    ctx.beginPath();
    ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 5);
    ctx.fill();
  }
  // Ojo en la cabeza, desplazado según la dirección
  const h = snake[0];
  const cx = h.x * CELL + CELL / 2 + dir.x * 4;
  const cy = h.y * CELL + CELL / 2 + dir.y * 4;
  ctx.fillStyle = '#0c2714';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px monospace';
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + score, 10, 10);

  ctx.textAlign = 'center';
  ctx.fillText('Nivel: ' + level, canvas.width / 2, 10);

  ctx.textAlign = 'right';
  ctx.fillText('Largo: ' + snake.length, canvas.width - 10, 10);
}

function drawOverlay(message, hint) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 20);

  ctx.font = 'bold 18px monospace';
  ctx.fillText(hint, canvas.width / 2, canvas.height / 2 + 32);
}

function draw() {
  drawBoard();
  drawFruit(food);
  drawSnake();
  drawHUD();

  if (gameState === 'paused')   drawOverlay('PAUSA', 'P o Esc para reanudar');
  if (gameState === 'gameover') drawOverlay('GAME OVER', 'R para reiniciar');
  if (gameState === 'win')      drawOverlay('¡PERFECTO!', 'R para reiniciar');
}

// ── Bucle ────────────────────────────────────────────────────────────────
function loop(ts) {
  if (lastTime === null) lastTime = ts;
  const dt = Math.min(ts - lastTime, 100); // clamp para no acumular pasos si la pestaña estuvo en segundo plano
  lastTime = ts;

  if (gameState === 'playing') {
    stepAcc += dt;
    while (stepAcc >= stepInterval()) {
      stepAcc -= stepInterval();
      tick();
      if (gameState !== 'playing') break;
    }
  }

  draw();
  requestAnimationFrame(loop);
}

fruitsImg.onload = () => {
  reset();
  requestAnimationFrame(loop);
};
fruitsImg.src = SPRITE_ATLAS.sources.fruits;
