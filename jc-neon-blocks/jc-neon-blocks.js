const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

context.scale(20, 20); // 12 x 20 grid → 240 x 400

const scoreElem = document.getElementById('score');
const linesElem = document.getElementById('lines');
const levelElem = document.getElementById('level');
const statusElem = document.getElementById('status');
const startOverlay = document.getElementById('startOverlay');

const colors = [
  null,
  '#ff4b6e', // T
  '#ffc857', // O
  '#44f1ff', // L
  '#9c88ff', // J
  '#4b7cf5', // I
  '#48ffb3', // S
  '#ff9bf5', // Z
];

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

function createPiece(type) {
  if (type === 'T') {
    return [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ];
  } else if (type === 'O') {
    return [
      [2, 2],
      [2, 2],
    ];
  } else if (type === 'L') {
    return [
      [0, 3, 0],
      [0, 3, 0],
      [0, 3, 3],
    ];
  } else if (type === 'J') {
    return [
      [0, 4, 0],
      [0, 4, 0],
      [4, 4, 0],
    ];
  } else if (type === 'I') {
    return [
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
    ];
  } else if (type === 'S') {
    return [
      [0, 6, 6],
      [6, 6, 0],
      [0, 0, 0],
    ];
  } else if (type === 'Z') {
    return [
      [7, 7, 0],
      [0, 7, 7],
      [0, 0, 0],
    ];
  }
}

function arenaSweep() {
  let rowCount = 1;
  let linesCleared = 0;

  outer: for (let y = arena.length - 1; y > 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;

    player.score += rowCount * 100;
    rowCount *= 2;
    linesCleared++;
  }

  if (linesCleared > 0) {
    player.lines += linesCleared;
    player.level = 1 + Math.floor(player.lines / 10);
    dropInterval = Math.max(120, 1000 - (player.level - 1) * 80);
    updateScore();
  }
}

function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (
        m[y][x] !== 0 &&
        (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0
      ) {
        return true;
      }
    }
  }
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerReset() {
  const pieces = 'ILJOTSZ';
  player.matrix = createPiece(pieces[(pieces.length * Math.random()) | 0]);
  player.pos.y = 0;
  player.pos.x =
    ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);

  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    statusElem.textContent = 'Game over – press R to re‑enter protocol';
    statusElem.classList.add('game-over');
    gameOver = true;
  }
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    arenaSweep();
    playerReset();
  }
  dropCounter = 0;
}

function playerHardDrop() {
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--;
  merge(arena, player);
  arenaSweep();
  playerReset();
  dropCounter = 0;
}

function playerMove(offset) {
  player.pos.x += offset;
  if (collide(arena, player)) {
    player.pos.x -= offset;
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

/* Drawing */

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        const hueColor = colors[value];
        context.fillStyle = hueColor;
        context.shadowColor = hueColor;
        context.shadowBlur = 15;
        context.fillRect(x + offset.x, y + offset.y, 1, 1);

        // subtle inner block
        context.shadowBlur = 0;
        context.fillStyle = 'rgba(0,0,0,0.28)';
        context.fillRect(x + offset.x + 0.15, y + offset.y + 0.15, 0.7, 0.7);
      }
    });
  });
}

function drawGrid() {
  context.save();
  context.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  context.lineWidth = 0.02;

  for (let x = 0; x < arena[0].length; x++) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, arena.length);
    context.stroke();
  }
  for (let y = 0; y < arena.length; y++) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(arena[0].length, y);
    context.stroke();
  }
  context.restore();
}

function drawBackgroundGlow() {
  const gradient = context.createLinearGradient(0, 0, 0, arena.length);
  gradient.addColorStop(0, 'rgba(75, 124, 245, 0.15)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 75, 154, 0.22)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, arena[0].length, arena.length);
}

function draw() {
  context.fillStyle = '#05071b';
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawBackgroundGlow();
  drawGrid();
  drawMatrix(arena, { x: 0, y: 0 });
  drawMatrix(player.matrix, player.pos);
}

/* Game loop */

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

let paused = false;
let started = false;
let gameOver = false;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;

  if (!paused && started && !gameOver) {
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
      playerDrop();
    }
  }

  draw();
  requestAnimationFrame(update);
}

/* UI */

function updateScore() {
  scoreElem.textContent = player.score;
  linesElem.textContent = player.lines;
  levelElem.textContent = player.level;
}

const arena = createMatrix(12, 20);
const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
  lines: 0,
  level: 1,
};

document.addEventListener('keydown', event => {
  if (!started && !gameOver) {
    started = true;
    startOverlay.classList.add('hidden');
    statusElem.textContent = 'Live protocol – P to pause';
  }

  if (event.key === 'ArrowLeft') {
    playerMove(-1);
  } else if (event.key === 'ArrowRight') {
    playerMove(1);
  } else if (event.key === 'ArrowDown') {
    playerDrop();
  } else if (event.key === 'ArrowUp') {
    playerRotate(1);
  } else if (event.code === 'Space') {
    event.preventDefault();
    playerHardDrop();
  } else if (event.key === 'p' || event.key === 'P') {
    if (gameOver) return;
    paused = !paused;
    statusElem.textContent = paused
      ? 'Paused – P to resume protocol'
      : 'Live protocol – P to pause';
  } else if (event.key === 'r' || event.key === 'R') {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.lines = 0;
    player.level = 1;
    dropInterval = 1000;
    updateScore();
    gameOver = false;
    paused = false;
    started = true;
    statusElem.textContent = 'Live protocol – P to pause';
    statusElem.classList.remove('game-over');
    startOverlay.classList.add('hidden');
    playerReset();
  }
});

playerReset();
updateScore();
update();

