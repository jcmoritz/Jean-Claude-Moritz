const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let ship = { x: 280, y: 550, width: 40, height: 20 };
let bullets = [];
let enemies = [];
let enemyDirection = 1;

// Create enemies
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 8; col++) {
    enemies.push({
      x: 60 + col * 60,
      y: 40 + row * 40,
      width: 30,
      height: 20,
      alive: true
    });
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" && ship.x > 10) ship.x -= 20;
  if (e.key === "ArrowRight" && ship.x < 550) ship.x += 20;
  if (e.key === " "){
    bullets.push({ x: ship.x + 18, y: ship.y, width: 4, height: 10 });
  }
});

function update() {
  // Move bullets
  bullets.forEach(b => b.y -= 5);

  // Move enemies
  let hitEdge = enemies.some(e => e.alive && (e.x <= 10 || e.x >= 560));
  if (hitEdge) enemyDirection *= -1;

  enemies.forEach(e => {
    if (e.alive) e.x += enemyDirection * 2;
  });

  // Bullet collision
  bullets.forEach(b => {
    enemies.forEach(e => {
      if (e.alive &&
          b.x < e.x + e.width &&
          b.x + b.width > e.x &&
          b.y < e.y + e.height &&
          b.y + b.height > e.y) {
        e.alive = false;
        b.y = -100; // remove bullet
      }
    });
  });
}

function draw() {
  ctx.clearRect(0, 0, 600, 600);

  // Draw ship
  ctx.fillStyle = "#0f0";
  ctx.fillRect(ship.x, ship.y, ship.width, ship.height);

  // Draw bullets
  bullets.forEach(b => {
    ctx.fillStyle = "#0f0";
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });

  // Draw enemies
  enemies.forEach(e => {
    if (e.alive) {
      ctx.fillStyle = "#f00";
      ctx.fillRect(e.x, e.y, e.width, e.height);
    }
  });
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
