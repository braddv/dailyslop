let player;
let gravity = 0.5;
let groundLevel;
let enemies = [];
let lastSpawnTime = 0;
let enemySpawnInterval = 1500; // in milliseconds
let buttonSize = 80;
let score = 0;
let gameOver = false;
let highscore = 0;  // Global highscore variable
let showInstructions = true;  // Flag to show instructions only until first jump

// New global variables for ground bad enemies.
let lastGroundBadSpawnTime = 0;
let groundBadSpawnInterval = 1000; // spawn ground bad enemy every 1000ms

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  // This line is added to disable default touch actions (like scrolling) on Safari.
  canvas.parent("game-container");
  canvas.style('touch-action', 'none');
  
  groundLevel = height - 50;
  // Make the player appear in the middle of the screen.
  player = new Player(width / 2, height / 2);
  
  // Also prevent default scrolling on document.
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });
}

function draw() {
  background(135, 206, 235); // Sky blue

  // Draw the gray floor.
  fill(128);
  noStroke();
  rect(0, groundLevel, width, height - groundLevel);

  // If game over, display game over screen.
  if (gameOver) {
    drawGameOver();
    return;
  }

  // Display game instructions at the top if not removed.
  if (showInstructions) {
    fill(0);
    textSize(18);
    textAlign(CENTER, TOP);
    // Moved the instructions down a bit.
    text("collect black cubes, avoid triangles", width / 2, 40);
  }

  // Spawn normal enemies at regular intervals.
  if (millis() - lastSpawnTime > enemySpawnInterval) {
    // Increase red triangle spawn chance over time.
    let badEnemyProbability = min(0.15 + score * 0.005, 0.7);
    if (random() < badEnemyProbability) {
      enemies.push(new BadEnemy());
    } else {
      enemies.push(new Enemy());
    }
    lastSpawnTime = millis();
  }
  
  // Spawn ground bad enemies continuously at ground level.
  if (millis() - lastGroundBadSpawnTime > groundBadSpawnInterval) {
    enemies.push(new GroundBadEnemy());
    lastGroundBadSpawnTime = millis();
  }

  // Update and display enemies.
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    enemies[i].display();
    if (enemies[i].offScreen()) {
      enemies.splice(i, 1);
    }
  }
  
  // Update and display the player.
  player.update();
  player.display();
  
  // Check collisions between player and enemies.
  checkCollisions();
  
  // Draw control buttons.
  drawButtons();
  
  // Draw score at the top middle.
  fill(0);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("Score: " + score, width / 2, 30);
}

function drawGameOver() {
  fill(0, 150);
  rect(0, 0, width, height);
  fill(255);
  textSize(48);
  textAlign(CENTER, CENTER);
  text("Game Over", width / 2, height / 2 - 60);
  textSize(32);
  text("Score: " + score, width / 2, height / 2 - 20);
  textSize(32);
  text("Highscore: " + highscore, width / 2, height / 2 + 20);
  textSize(18);
  text("Click to restart", width / 2, height / 2 + 60);
}

class Player {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.size = 30;
  }
  
  update() {
    // Apply gravity.
    this.vel.y += gravity;
    this.pos.add(this.vel);
    
    // Ground collision.
    if (this.pos.y + this.size / 2 > groundLevel) {
      this.pos.y = groundLevel - this.size / 2;
      this.vel.y = 0;
      // Reset horizontal velocity upon landing.
      this.vel.x = 0;
    }
    
    // Horizontal boundaries.
    if (this.pos.x < 0) {
      this.pos.x = 0;
      this.vel.x = 0;
    }
    if (this.pos.x > width) {
      this.pos.x = width;
      this.vel.x = 0;
    }
  }
  
  display() {
    fill(255, 100, 100);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.size);
  }
  
  // Jump to the left: updated horizontal and upward impulse.
  moveLeft() {
    if (showInstructions) showInstructions = false;
    this.vel.x = -5;
    this.vel.y = -7;
  }
  
  // Jump to the right.
  moveRight() {
    if (showInstructions) showInstructions = false;
    this.vel.x = 5;
    this.vel.y = -7;
  }
}

class Enemy {
  constructor() {
    // Randomly choose left or right spawn.
    this.fromLeft = random([true, false]);
    if (random(0,1) < 0.2) {
      this.y = groundLevel - 15;
    } else {
      this.y = random(height * 0.2, height * 0.8);
    }
    if (this.fromLeft) {
      this.pos = createVector(-20, this.y);
      this.vel = createVector(random(2, 4), 0);
    } else {
      this.pos = createVector(width + 20, this.y);
      this.vel = createVector(-random(2, 4), 0);
    }
    this.size = 30;
  }
  
  update() {
    this.pos.add(this.vel);
  }
  
  display() {
    push();
    rectMode(CENTER);
    fill(0);
    noStroke();
    rect(this.pos.x, this.pos.y, this.size, this.size);
    pop();
  }
  
  offScreen() {
    return (this.pos.x < -50 || this.pos.x > width + 50);
  }
}

// BadEnemy: red triangle that kills you on collision.
class BadEnemy {
  constructor() {
    this.fromLeft = random([true, false]);
    if (random(0,1) < 0.2) {
      this.y = groundLevel - 15;
    } else {
      this.y = random(height * 0.2, height * 0.8);
    }
    if (this.fromLeft) {
      this.pos = createVector(-20, this.y);
      this.vel = createVector(random(2, 4), 0);
    } else {
      this.pos = createVector(width + 20, this.y);
      this.vel = createVector(-random(2, 4), 0);
    }
    this.size = 30;
  }
  
  update() {
    this.pos.add(this.vel);
  }
  
  display() {
    push();
    fill(255, 0, 0);
    noStroke();
    triangle(
      this.pos.x, this.pos.y - this.size/2,
      this.pos.x - this.size/2, this.pos.y + this.size/2,
      this.pos.x + this.size/2, this.pos.y + this.size/2
    );
    pop();
  }
  
  offScreen() {
    return (this.pos.x < -50 || this.pos.x > width + 50);
  }
}

// GroundBadEnemy: continuously spawns at ground level.
class GroundBadEnemy {
  constructor() {
    this.fromLeft = random([true, false]);
    this.y = groundLevel - 15;
    if (this.fromLeft) {
      this.pos = createVector(-20, this.y);
      this.vel = createVector(random(2, 4), 0);
    } else {
      this.pos = createVector(width + 20, this.y);
      this.vel = createVector(-random(2, 4), 0);
    }
    this.size = 30;
  }
  
  update() {
    this.pos.add(this.vel);
  }
  
  display() {
    push();
    fill(255, 0, 0);
    noStroke();
    triangle(
      this.pos.x, this.pos.y - this.size/2,
      this.pos.x - this.size/2, this.pos.y + this.size/2,
      this.pos.x + this.size/2, this.pos.y + this.size/2
    );
    pop();
  }
  
  offScreen() {
    return (this.pos.x < -50 || this.pos.x > width + 50);
  }
}

function drawButtons() {
  push();
  rectMode(CORNER);
  // Draw left button in the bottom left.
  fill(50, 150, 250);
  rect(20, height - buttonSize - 20, buttonSize, buttonSize, 10);
  fill(255);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("←", 20 + buttonSize / 2, height - buttonSize / 2 - 20);
  
  // Draw right button in the bottom right.
  fill(50, 150, 250);
  rect(width - buttonSize - 20, height - buttonSize - 20, buttonSize, buttonSize, 10);
  fill(255);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("→", width - buttonSize / 2 - 20, height - buttonSize / 2 - 20);
  pop();
}

function mousePressed() {
  // If the game is over, clicking anywhere will restart the game.
  if (gameOver) {
    if (score > highscore) {
      highscore = score;
    }
    gameOver = false;
    score = 0;
    player = new Player(width / 2, height / 2);
    enemies = [];
    showInstructions = true;
    return;
  }
  
  // Check if the left button is pressed.
  if (mouseX > 20 && mouseX < 20 + buttonSize &&
      mouseY > height - buttonSize - 20 && mouseY < height - 20) {
    player.moveLeft();
  }
  // Check if the right button is pressed.
  if (mouseX > width - buttonSize - 20 && mouseX < width - 20 &&
      mouseY > height - buttonSize - 20 && mouseY < height - 20) {
    player.moveRight();
  }
}

function touchStarted() {
  mousePressed();
  return false;
}

function checkCollisions() {
  // Check collision between player and each enemy.
  for (let i = enemies.length - 1; i >= 0; i--) {
    let d = dist(player.pos.x, player.pos.y, enemies[i].pos.x, enemies[i].pos.y);
    if (d < (player.size/2 + enemies[i].size/2)) {
      // If enemy is a BadEnemy or a GroundBadEnemy, player dies.
      if (enemies[i] instanceof BadEnemy || enemies[i] instanceof GroundBadEnemy) {
        gameOver = true;
      } else {
        score++;
      }
      enemies.splice(i, 1);
    }
  }
}

function mouseReleased() {
  // Check if the left or right control buttons are pressed.
  if (mouseX > 20 && mouseX < 20 + buttonSize &&
      mouseY > height - buttonSize - 20 && mouseY < height - 20) {
    player.moveLeft();
  }
  if (mouseX > width - buttonSize - 20 && mouseX < width - 20 &&
      mouseY > height - buttonSize - 20 && mouseY < height - 20) {
    player.moveRight();
  }
}

function touchEnded() {
  return false;
}

function keyPressed() {
  // For debugging: pressing any key when game over also restarts the game.
  if (gameOver) {
    if (score > highscore) {
      highscore = score;
    }
    gameOver = false;
    score = 0;
    player = new Player(width / 2, height / 2);
    enemies = [];
    showInstructions = true;
  }
}
