const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const levelEl = document.getElementById("level");
const messageEl = document.getElementById("message");

// Game state
let gameState = "loading"; // loading, menu, playing, levelComplete, bossIntro, gameOver
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

// Input state
const keys = {
  left: false,
  right: false,
  shoot: false
};

// Sounds (will fail gracefully if files missing)
const sounds = {
  shoot: new Audio("assets/sounds/shoot.wav"),
  explosion: new Audio("assets/sounds/explosion.wav"),
  levelUp: new Audio("assets/sounds/level-up.wav"),
  bossIntro: new Audio("assets/sounds/boss-intro.wav"),
  gameOver: new Audio("assets/sounds/game-over.wav")
};

Object.values(sounds).forEach(a => (a.volume = 0.5));

// ---- Initialization ----
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
  const rows = 3 + Math.min(lvl, 3); // 3 to 6 rows
  const cols = 6 + Math.min(lvl, 4); // 6 to 10 columns
  const xStart = 40;
  const yStart = 60;
  const xSpacing = 60;
  const ySpacing = 40;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      enemies.push({
        x: xStart + c * xSpacing,
        y: yStart + r * ySpacing,
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

// ---- Input handling ----
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") keys.left = true;
  if (e.key === "ArrowRight") keys.right = true;
  if (e.key === " ") keys.shoot = true;
  if (e.key === "Enter") {
    if (gameState === "menu" || gameState === "gameOver") {
      startGame();
    } else if (gameState === "levelComplete") {
      nextLevel();
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") keys.left = false;
  if (e.key === "ArrowRight") keys.right = false;
  if (e.key === " ") keys.shoot = false;
});

// ---- State transitions ----
function loadingDone() {
  highScoreEl.textContent = highScore;
  gameState = "menu";
  setMessage("Press ENTER to begin Juan Claudio's Revenge.", "#4f8cff");
}

function startGame() {
  level = 1;
  score = 0;
  scoreEl.textContent = score;
  levelEl.textContent = level;
  resetEntities();
  createEnemiesForLevel(level);
  ship.x = canvas.width / 2 - ship.width / 2;
  ship.cooldown = 0;
  gameState = "playing";
  setMessage("Destroy the invaders before they reach you!", "#888");
}

function nextLevel() {
  level++;
  levelEl.textContent = level;
  resetEntities();

  if (level % 3 === 0) {
    // Boss level
    createBoss(level);
    gameState = "bossIntro";
    setMessage("Boss approaching... Press ENTER to fight!", "#ffb347");
    try { sounds.bossIntro.play(); } catch {}
  } else {
    createEnemiesForLevel(level);
    gameState = "playing";
    setMessage("Level " + level + " — they’re getting faster.", "#888");
    try { sounds.levelUp.play(); } catch {}
  }
}

function endGame() {
  gameState = "gameOver";
  setMessage("Game Over. Press ENTER to try again.", "#ff4f4f");
  try { sounds.gameOver.play(); } catch {}

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("jc_highscore", highScore);
    highScoreEl.textContent = highScore;
  }
}

// ---- Update logic ----
let enemyDirection = 1;
let enemyStepDown = false;

function update() {
  if (gameState === "loading" || gameState === "menu" || gameState === "gameOver" || gameState === "levelComplete" || gameState === "bossIntro") {
    return;
  }

  // Player movement
  if (keys.left) ship.x -= ship.speed;
  if (keys.right) ship.x += ship.speed;
  ship.x = Math.max(10, Math.min(canvas.width - ship.width - 10, ship.x));

  // Shooting
  if (ship.cooldown > 0) ship.cooldown--;
  if (keys.shoot && ship.cooldown === 0 && gameState === "playing" || (gameState === "playingBoss")) {
    bullets.push({
      x: ship.x + ship.width / 2 - 2,
      y: ship.y,
      width: 4,
      height: 10,
      speed: 8
    });
    ship.cooldown = 12;
    try { sounds.shoot.currentTime = 0; sounds.shoot.play(); } catch {}
  }

  // Bullets
  bullets.forEach(b => {
    b.y -= b.speed;
  });
  bullets = bullets.filter(b => b.y + b.height > 0);

  // Enemies movement
  if (gameState === "playing") {
    let hitEdge = false;
    enemies.forEach(e => {
      if (!e.alive) return;
      e.x += enemyDirection * (1.2 + level * 0.3);
      if (e.x <= 10 || e.x + e.width >= canvas.width - 10) {
        hitEdge = true;
      }
    });
    if (hitEdge) {
      enemyDirection *= -1;
      enemyStepDown = true;
    }
    if (enemyStepDown) {
      enemies.forEach(e => {
        if (!e.alive) return;
        e.y += 10;
        if (e.y + e.height >= ship.y) {
          endGame();
        }
      });
      enemyStepDown = false;
    }

    // Random enemy shots
    enemies.forEach(e => {
      if (!e.alive) return;
      if (Math.random() < 0.002 + level * 0.0005) {
        enemyBullets.push({
          x: e.x + e.width / 2 - 2,
          y: e.y + e.height,
          width: 4,
          height: 10,
          speed: 4 + level * 0.3
        });
      }
    });
  }

  // Boss movement + attacks
  if (boss) {
    boss.x += boss.dir * boss.speed;
    if (boss.x <= 20 || boss.x + boss.width >= canvas.width - 20) {
      boss.dir *= -1;
    }

    boss.shotCooldown--;
    if (boss.shotCooldown <= 0) {
      enemyBullets.push({
        x: boss.x + boss.width / 2 - 3,
        y: boss.y + boss.height,
        width: 6,
        height: 14,
        speed: 5 + level * 0.3,
        boss: true
      });
      boss.shotCooldown = 40;
    }
  }

  // Enemy bullets
  enemyBullets.forEach(b => {
    b.y += b.speed;
  });
  enemyBullets = enemyBullets.filter(b => b.y <= canvas.height + 20);

  // Collisions: player bullets vs enemies
  bullets.forEach(b => {
    enemies.forEach(e => {
      if (!e.alive) return;
      if (
        b.x < e.x + e.width &&
        b.x + b.width > e.x &&
        b.y < e.y + e.height &&
        b.y + b.height > e.y
      ) {
        e.alive = false;
        b.y = -100;
        score += 10;
        scoreEl.textContent = score;
        addExplosion(e.x + e.width / 2, e.y + e.height / 2, "#ff4f4f");
        try { sounds.explosion.currentTime = 0; sounds.explosion.play(); } catch {}
      }
    });
  });

  // Collisions: player bullets vs boss
  if (boss) {
    bullets.forEach(b => {
      if (
        b.x < boss.x + boss.width &&
        b.x + b.width > boss.x &&
        b.y < boss.y + boss.height &&
        b.y + b.height > boss.y
      ) {
        boss.hp--;
        b.y = -100;
        addExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, "#ffb347");
        try { sounds.explosion.currentTime = 0; sounds.explosion.play(); } catch {}
        score += 20;
        scoreEl.textContent = score;
        if (boss.hp <= 0) {
          addExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, "#ffffff", 40);
          boss = null;
          gameState = "levelComplete";
          setMessage("Boss defeated! Press ENTER for the next wave.", "#29c76f");
          try { sounds.levelUp.play(); } catch {}
        }
      }
    });
  }

  // Collisions: enemy bullets vs player
  enemyBullets.forEach(b => {
    if (
      b.x < ship.x + ship.width &&
      b.x + b.width > ship.x &&
      b.y < ship.y + ship.height &&
      b.y + b.height > ship.y
    ) {
      addExplosion(ship.x + ship.width / 2, ship.y + ship.height / 2, "#ff4f4f", 30);
      endGame();
    }
  });

  // Win condition for regular levels
  if (gameState === "playing" && enemies.every(e => !e.alive)) {
    gameState = "levelComplete";
    setMessage("Wave cleared! Press ENTER for the next level.", "#29c76f");
    try { sounds.levelUp.play(); } catch {}
  }

  // Explosions
  explosions.forEach(ex => {
    ex.life--;
  });
  explosions = explosions.filter(ex => ex.life > 0);
}

// Explosion helper
function addExplosion(x, y, color, life = 20) {
  explosions.push({ x, y, color, life });
}

// ---- Drawing ----
function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#05070b");
  gradient.addColorStop(1, "#020309");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stars
  ctx.fillStyle = "#1f2633";
  for (let i = 0; i < 40; i++) {
    const x = (i * 53 + performance.now() * 0.01) % canvas.width;
    const y = (i * 79) % canvas.height;
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawShip() {
  ctx.fillStyle = "#4f8cff";
  ctx.fillRect(ship.x, ship.y, ship.width, ship.height);
  ctx.fillStyle = "#9ec0ff";
  ctx.fillRect(ship.x + ship.width / 4, ship.y - 6, ship.width / 2, 6);
}

function drawEnemies() {
  enemies.forEach(e => {
    if (!e.alive) return;
    ctx.fillStyle = "#ff4f4f";
    ctx.fillRect(e.x, e.y, e.width, e.height);
    ctx.fillStyle = "#ffb347";
    ctx.fillRect(e.x + 5, e.y + 5, e.width - 10, 4);
  });
}

function drawBoss() {
  if (!boss) return;
  const ratio = boss.hp / boss.maxHp;
  ctx.fillStyle = "#7b5cff";
  ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(boss.x + 10, boss.y + 8, boss.width - 20, 6);

  // HP bar
  ctx.fillStyle = "#222";
  ctx.fillRect(boss.x, boss.y - 12, boss.width, 6);
  ctx.fillStyle = "#29c76f";
  ctx.fillRect(boss.x, boss.y - 12, boss.width * ratio, 6);
}

function drawBullets() {
  ctx.fillStyle = "#9ec0ff";
  bullets.forEach(b => {
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });

  enemyBullets.forEach(b => {
    ctx.fillStyle = b.boss ? "#ffb347" : "#ff4f4f";
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });
}

function drawExplosions() {
  explosions.forEach(ex => {
    const alpha = ex.life / 20;
    ctx.fillStyle = ex.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, (20 - ex.life) + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });
}

function drawOverlayText() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";

  if (gameState === "menu") {
    ctx.font = "26px 'Segoe UI'";
    ctx.fillText("Juan Claudio's Revenge", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "16px 'Segoe UI'";
    ctx.fillText("Press ENTER to begin", canvas.width / 2, canvas.height / 2 + 10);
  } else if (gameState === "gameOver") {
    ctx.font = "26px 'Segoe UI'";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "16px 'Segoe UI'";
    ctx.fillText("Press ENTER to try again", canvas.width / 2, canvas.height / 2 + 10);
  } else if (gameState === "levelComplete") {
    ctx.font = "24px 'Segoe UI'";
    ctx.fillText("Wave Cleared!", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "16px 'Segoe UI'";
    ctx.fillText("Press ENTER for the next level", canvas.width / 2, canvas.height / 2 + 10);
  } else if (gameState === "bossIntro") {
    ctx.font = "24px 'Segoe UI'";
    ctx.fillText("Boss Incoming", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "16px 'Segoe UI'";
    ctx.fillText("Press ENTER to face your nemesis", canvas.width / 2, canvas.height / 2 + 10);
  }
}

// ---- Main loop ----
function loop() {
  drawBackground();
  if (gameState !== "loading") {
    update();
    drawEnemies();
    drawBoss();
    drawShip();
    drawBullets();
    drawExplosions();

    if (gameState === "menu" || gameState === "gameOver" || gameState === "levelComplete" || gameState === "bossIntro") {
      drawOverlayText();
    }
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "18px 'Segoe UI'";
    ctx.fillText("Loading Juan Claudio's Revenge...", canvas.width / 2, canvas.height / 2);
  }

  requestAnimationFrame(loop);
}

// Start
setTimeout(loadingDone, 600); // tiny fake loading delay
loop();
  
