// Global Variables
let player;
let asteroids = [];
let bullets = [];
let score = 0;
let highScore = 0;
let gameOver = false;

let joystick; // Left-side on-screen joystick
let shootButton; // Right-side shoot button area

function setup() {
  // Create full-window canvas
  let cnv = createCanvas(windowWidth, windowHeight);
  // Safari compatibility: disable default touch actions to prevent scrolling
  cnv.style('touch-action', 'none');
  cnv.parent("game-container");

  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  
  resetGame();
  // Initialize joystick at bottom left (base at (100, height-100), radius 50)
  joystick = new Joystick(100, height - 100, 50);
  // Define shoot button area on the bottom right
  shootButton = { x: width - 150, y: height - 150, size: 80 };
}

function resetGame() {
  player = new Player(width / 2, height / 2);
  asteroids = [];
  bullets = [];
  score = 0;
  gameOver = false;
  
  // Spawn some asteroids (circles) at random positions away from the player.
  for (let i = 0; i < 5; i++) {
    let pos = createVector(random(width), random(height));
    if (p5.Vector.dist(pos, createVector(width / 2, height / 2)) < 100) {
      pos = createVector(random(width), random(height));
    }
    let r = random(30, 50);
    asteroids.push(new Asteroid(pos.x, pos.y, r));
  }
}

function draw() {
  background(30);
  
  if (gameOver) {
    // Display Game Over Screen with score and high score
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(48);
    text("Game Over", width / 2, height / 2 - 60);
    textSize(24);
    text("Score: " + score, width / 2, height / 2);
    text("High Score: " + highScore, width / 2, height / 2 + 30);
    text("Tap to restart", width / 2, height / 2 + 70);
    noLoop();
    return;
  }
  
  // Update player position based on joystick input.
  let direction = joystick.getVector();
  player.update(direction);
  player.display();
  
  // Update and display bullets.
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update();
    bullets[i].display();
    if (bullets[i].offscreen()) {
      bullets.splice(i, 1);
    }
  }
  
  // Update and display asteroids.
  for (let i = asteroids.length - 1; i >= 0; i--) {
    asteroids[i].update();
    asteroids[i].display();
    
    // Check collision with the player.
    if (asteroids[i].hits(player)) {
      if (score > highScore) highScore = score;
      gameOver = true;
    }
    
    // Check collision with each bullet.
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (asteroids[i].contains(bullets[j].pos)) {
        let newAsteroids = asteroids[i].breakup();
        if (newAsteroids) {
          asteroids = asteroids.concat(newAsteroids);
        }
        asteroids.splice(i, 1);
        bullets.splice(j, 1);
        score += 10;
        break;
      }
    }
  }
  
  // Display score in the top left during gameplay.
  fill(255);
  textSize(24);
  textAlign(LEFT, TOP);
  text("Score: " + score, 10, 10);
  
  // Draw on-screen joystick and shoot button.
  joystick.display();
  drawShootButton();
}

function drawShootButton() {
  fill(50, 150, 250);
  rect(shootButton.x, shootButton.y, shootButton.size, shootButton.size, 10);
  fill(255);
  textSize(20);
  textAlign(CENTER, CENTER);
  text("Shoot", shootButton.x + shootButton.size / 2, shootButton.y + shootButton.size / 2);
}

//====================
// Player Class
//====================
class Player {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.size = 30;
    this.angle = -HALF_PI; // Start pointing upward
    this.speed = 5;
  }
  
  update(direction) {
    // If joystick is providing directional input, update angle and position.
    if (direction.mag() > 0.1) {
      // Set player's angle so the triangle (with tip at (0, -size)) points toward the joystick.
      this.angle = direction.heading() + HALF_PI;
      let velocity = direction.copy().setMag(this.speed);
      this.pos.add(velocity);
    }
    // Constrain player within canvas.
    this.pos.x = constrain(this.pos.x, 0, width);
    this.pos.y = constrain(this.pos.y, 0, height);
  }
  
  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    fill(255, 0, 0);
    noStroke();
    // Draw a triangle with its tip at (0, -this.size)
    triangle(0, -this.size, -this.size / 2, this.size / 2, this.size / 2, this.size / 2);
    pop();
  }
}

//====================
// Asteroid Class
//====================
class Asteroid {
  constructor(x, y, r) {
    this.pos = createVector(x, y);
    this.r = r;
    this.vel = p5.Vector.random2D();
    this.vel.mult(random(0.5, 2));
  }
  
  update() {
    this.pos.add(this.vel);
    // Wrap around the canvas edges.
    if (this.pos.x < -this.r) this.pos.x = width + this.r;
    if (this.pos.x > width + this.r) this.pos.x = -this.r;
    if (this.pos.y < -this.r) this.pos.y = height + this.r;
    if (this.pos.y > height + this.r) this.pos.y = -this.r;
  }
  
  display() {
    fill(200);
    stroke(255);
    ellipse(this.pos.x, this.pos.y, this.r * 2);
  }
  
  contains(point) {
    let d = dist(point.x, point.y, this.pos.x, this.pos.y);
    return (d < this.r);
  }
  
  // Simple collision detection with the player.
  hits(player) {
    let d = dist(this.pos.x, this.pos.y, player.pos.x, player.pos.y);
    return d < this.r + player.size / 2;
  }
  
  // Breakup the asteroid into smaller pieces if it's large enough.
  breakup() {
    if (this.r > 15) {
      let newAsteroids = [];
      let num = floor(random(2, 4));
      for (let i = 0; i < num; i++) {
        let newR = this.r * 0.5;
        let a = random(TWO_PI);
        let newPos = this.pos.copy().add(p5.Vector.fromAngle(a, newR));
        let newAst = new Asteroid(newPos.x, newPos.y, newR);
        newAst.vel = p5.Vector.fromAngle(a, random(1, 3));
        newAsteroids.push(newAst);
      }
      return newAsteroids;
    } else {
      return null;
    }
  }
}

//====================
// Bullet Class
//====================
class Bullet {
  constructor(x, y, angle) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.fromAngle(angle);
    this.vel.mult(10);
    this.r = 4;
  }
  
  update() {
    this.pos.add(this.vel);
  }
  
  display() {
    fill(255, 255, 0);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.r * 2);
  }
  
  offscreen() {
    return (this.pos.x < 0 || this.pos.x > width || this.pos.y < 0 || this.pos.y > height);
  }
}

//====================
// Joystick Class
//====================
class Joystick {
  constructor(x, y, r) {
    this.base = createVector(x, y);
    this.r = r;
    this.knob = createVector(x, y);
    this.active = false;
  }
  
  update() {
    if (this.active) {
      let pos = createVector(mouseX, mouseY);
      // For multi-touch, we rely on touches in touchStarted/touchMoved
      if (touches.length > 0) {
        // Use the first touch that falls within the joystick's base.
        for (let t of touches) {
          if (dist(t.x, t.y, this.base.x, this.base.y) < this.r) {
            pos = createVector(t.x, t.y);
            break;
          }
        }
      }
      let dir = p5.Vector.sub(pos, this.base);
      if (dir.mag() > this.r) {
        dir.setMag(this.r);
      }
      this.knob = p5.Vector.add(this.base, dir);
    } else {
      this.knob = this.base.copy();
    }
  }
  
  getVector() {
    let dir = p5.Vector.sub(this.knob, this.base);
    return dir.copy().div(this.r); // Normalized vector (0 to 1 magnitude)
  }
  
  display() {
    this.update();
    noFill();
    stroke(255);
    ellipse(this.base.x, this.base.y, this.r * 2);
    fill(255, 150);
    noStroke();
    ellipse(this.knob.x, this.knob.y, this.r);
  }
}

//====================
// Input Handling
//====================

// Desktop mouse events:
function mousePressed() {
  // If game is over, restart immediately.
  if (gameOver) {
    resetGame();
    loop();
    return;
  }
  
  if (dist(mouseX, mouseY, joystick.base.x, joystick.base.y) < joystick.r) {
    joystick.active = true;
  }
  if (mouseX > shootButton.x && mouseX < shootButton.x + shootButton.size &&
      mouseY > shootButton.y && mouseY < shootButton.y + shootButton.size) {
    fireBullet();
  }
}

function mouseReleased() {
  joystick.active = false;
}

// Multi-touch events:
function touchStarted() {
  // If game is over, restart immediately.
  if (gameOver) {
    resetGame();
    loop();
    return false;
  }
  
  // Process each touch point.
  for (let t of touches) {
    if (dist(t.x, t.y, joystick.base.x, joystick.base.y) < joystick.r) {
      joystick.active = true;
    }
    if (t.x > shootButton.x && t.x < shootButton.x + shootButton.size &&
        t.y > shootButton.y && t.y < shootButton.y + shootButton.size) {
      fireBullet();
    }
  }
  return false;
}

function touchEnded() {
  // If no remaining touch is in the joystick area, disable it.
  let stillActive = false;
  for (let t of touches) {
    if (dist(t.x, t.y, joystick.base.x, joystick.base.y) < joystick.r) {
      stillActive = true;
      break;
    }
  }
  joystick.active = stillActive;
  return false;
}

function fireBullet() {
  // Calculate the tip of the triangle in world coordinates.
  let tipOffset = createVector(0, -player.size);
  tipOffset.rotate(player.angle);
  let bulletStart = p5.Vector.add(player.pos, tipOffset);
  // The bullet's velocity vector aligns with the direction the player is pointing.
  let bulletAngle = player.angle - HALF_PI;
  let bullet = new Bullet(bulletStart.x, bulletStart.y, bulletAngle);
  bullets.push(bullet);
}
