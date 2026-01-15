// ------------------------------------------------------------
// JUAN CLAUDIO'S REVENGE — MOBILE OPTIMIZED
// Version - 1.0
// ------------------------------------------------------------

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const levelEl = document.getElementById("level");
const messageEl = document.getElementById("message");

// Detect mobile
const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

// Game state
let gameState = "loading"; 
let level = 1;
let score = 0;
let highScore = parseInt(localStorage.getItem("jc_highscore") || "0", 10);

// Player
const ship = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 60,
  width: 40,
  height: 20,
  speed: 6,
  cooldown: 0
};

// Entities
let bullets = [];
let enemies = [];
let enemyBullets = [];
let explosions = [];
let boss = null;

const keys = { left: false, right: false, shoot: false };

// Mobile tracking
let touchStartX = null;
let touchStartTime = null;

// Sounds
const sounds = {
  shoot: new Audio("Assets/sounds/shoot.wav"),
  explosion: new Audio("Assets/sounds/explosion.wav"),
  levelUp: new Audio("Assets/sounds/level-up.wav"),
  bossIntro: new Audio("Assets/sounds/boss-intro.wav"),
  gameOver: new Audio("Assets/sounds/game-over.wav")
};

// Helper to play sound safely on iPhone
function playSound(audio) {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
        // Quietly fail if audio isn't loaded or user hasn't tapped yet
    });
}

function setMessage(text, color = "#888") {
  messageEl.textContent = text;
  messageEl.style.color = color;
}

function resetEntities() {
  bullets = [];
  enemyBullets = [];
  explosions = [];
  boss = null;
}

function createEnemiesForLevel(lvl) {
  enemies = [];
  const rows = 3 + Math.min(lvl, 3);
  const cols = 6 + Math.min(lvl, 4);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      enemies.push({
        x: 40 + c * 60,
        y: 60 + r * 40,
        width: 30,
        height: 20,
        alive: true
      });
    }
  }
}

function createBoss(lvl) {
  boss = {
    x: canvas.width / 2 - 80,
    y: 80,
    width: 160,
    height: 40,
    hp: 10 + lvl * 5,
    maxHp: 10 + lvl * 5,
    dir: 1,
    speed: 2 + lvl * 0.5,
    shotCooldown: 60
  };
}

// Controls
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") keys.left = true;
  if (e.key === "ArrowRight") keys.right = true;
  if (e.key === " ") keys.shoot = true;
  if (e.key === "Enter") handleActionInput();
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") keys.left = false;
  if (e.key === "ArrowRight") keys.right = false;
  if (e.key === " ") keys.shoot = false;
});

// Unified "Proceed" logic for both Enter and Taps
function handleActionInput() {
    if (gameState === "menu" || gameState === "gameOver") startGame();
    else if (gameState === "levelComplete") nextLevel();
    else if (gameState === "bossIntro") {
      gameState = "playing";
      setMessage("");
    }
}

// Mobile Events
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartTime = Date.now();
}, {passive: false});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  if (deltaX > 30) { keys.right = true; keys.left = false; }
  else if (deltaX < -30) { keys.left = true; keys.right = false; }
}, {passive: false});

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const duration = Date.now() - touchStartTime;

  keys.left = false;
  keys.right = false;

  // If it's a quick tap
  if (Math.abs(deltaX) < 20 && duration < 250) {
    if (gameState === "playing") {
      keys.shoot = true;
      setTimeout(() => (keys.shoot = false), 100);
    } else {
      handleActionInput();
    }
  }
}, {passive: false});

// Game Loop Functions
function loadingDone() {
  highScoreEl.textContent = highScore;
  gameState = "menu";
  setMessage("Tap Screen or Press ENTER to begin.", "#4f8cff");
}

function startGame() {
  level = 1; score = 0;
  scoreEl.textContent = score;
  levelEl.textContent = level;
  resetEntities();
  createEnemiesForLevel(level);
  ship.x = canvas.width / 2 - ship.width / 2;
  gameState = "playing";
  setMessage("");
}

function nextLevel() {
  level++;
  levelEl.textContent = level;
  resetEntities();
  if (level % 3 === 0) {
    createBoss(level);
    gameState = "bossIntro";
    setMessage("Boss approaching...", "#ffb347");
    playSound(sounds.bossIntro);
  } else {
    createEnemiesForLevel(level);
    gameState = "playing";
    playSound(sounds.levelUp);
  }
}

function endGame() {
  gameState = "gameOver";
  setMessage("Game Over", "#ff4f4f");
  playSound(sounds.gameOver);
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("jc_highscore", highScore);
    highScoreEl.textContent = highScore;
  }
}

let enemyDirection = 1;
function update() {
  if (gameState !== "playing") return;

  if (keys.left) ship.x -= ship.speed;
  if (keys.right) ship.x += ship.speed;
  ship.x = Math.max(0, Math.min(canvas.width - ship.width, ship.x));

  if (ship.cooldown > 0) ship.cooldown--;
  if (keys.shoot && ship.cooldown === 0) {
    bullets.push({ x: ship.x + ship.width/2 - 2, y: ship.y, width: 4, height: 10, speed: 8 });
    ship.cooldown = 15;
    playSound(sounds.shoot);
  }

  bullets.forEach(b => b.y -= b.speed);
  bullets = bullets.filter(b => b.y > 0);

  // Enemy movement
  let hitEdge = false;
  enemies.forEach(e => {
    if (!e.alive) return;
    e.x += enemyDirection * (1 + level * 0.2);
    if (e.x <= 0 || e.x + e.width >= canvas.width) hitEdge = true;
  });

  if (hitEdge) {
    enemyDirection *= -1;
    enemies.forEach(e => { if(e.alive) e.y += 15; if(e.y + e.height >= ship.y) endGame(); });
  }

  // Basic collisions
  bullets.forEach(b => {
    enemies.forEach(e => {
      if (e.alive && b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
        e.alive = false; b.y = -100; score += 10;
        scoreEl.textContent = score;
        playSound(sounds.explosion);
      }
    });
  });

  if (enemies.every(e => !e.alive) && !boss) nextLevel();
}

function draw() {
  ctx.fillStyle = "#05070b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = "#4f8cff";
  ctx.fillRect(ship.x, ship.y, ship.width, ship.height);

  ctx.fillStyle = "#ff4f4f";
  enemies.forEach(e => { if(e.alive) ctx.fillRect(e.x, e.y, e.width, e.height); });

  ctx.fillStyle = "#9ec0ff";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  if (gameState === "menu") {
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "20px Arial";
    ctx.fillText("JUAN CLAUDIO'S REVENGE", canvas.width/2, canvas.height/2);
    ctx.fillText("Tap to Start", canvas.width/2, canvas.height/2 + 40);
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
loadingDone(); // Start the game state

                 
