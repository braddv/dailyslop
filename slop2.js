let plants = [];
let waterParticles = [];
let gameOver = false;

let score = 0;
let highScore = 0;
let startTime = 0;

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  // Disable default touch actions for Safari
  cnv.style('touch-action', 'none');
  document.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });
  
  // Create 5 plants equally spaced along the width.
  for (let i = 0; i < 5; i++) {
    let size = random(50, 80);
    let x = (i + 1) * width / 6;
    // Set y so that the bottom of the trunk is at height - 100 (top of grass), then lower by 30 pixels.
    let y = height - 100 - (size * 0.8) / 2 + 30;
    plants.push(new Plant(x, y, size));
  }
  startTime = millis();
}

function draw() {
  background(200, 230, 255); // Light sky background
  
  // Draw the grass
  fill(100, 200, 100);
  rect(0, height - 100, width, 100);
  
  // If game over, display the game over screen and stop updating.
  if (gameOver) {
    drawGameOver();
    return;
  }
  
  // Update score (time survived in milliseconds)
  score = millis() - startTime;
  
  // Update and display plants
  for (let plant of plants) {
    plant.update();
    plant.display();
  }
  
  // Update and display water particles
  for (let i = waterParticles.length - 1; i >= 0; i--) {
    let p = waterParticles[i];
    p.update();
    p.display();
    
    // Check if this particle hits any plant
    let hit = false;
    for (let plant of plants) {
      if (p.hits(plant)) {
        plant.water(0.2); // Increase hydration and vertical growth
        hit = true;
        break;
      }
    }
    if (hit || p.offScreen()) {
      waterParticles.splice(i, 1);
    }
  }
}

function mousePressed() {
  if (gameOver) {
    restartGame();
    return false;
  }
  createWaterParticles(mouseX, mouseY);
  return false;
}

function touchStarted() {
  if (gameOver) {
    restartGame();
    return false;
  }
  if (touches.length > 0) {
    createWaterParticles(touches[0].x, touches[0].y);
  }
  return false;
}

function createWaterParticles(x, y) {
  let numParticles = 10;
  for (let i = 0; i < numParticles; i++) {
    waterParticles.push(new WaterParticle(x, y));
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Optionally, reposition plants on resize
}


//--------------------------------------------------
// drawGameOver Function
//--------------------------------------------------
function drawGameOver() {
  background(0, 150);
  fill(255);
  textSize(48);
  textAlign(CENTER, CENTER);
  text("Game Over", width / 2, height / 2 - 20);
  textSize(32);
  text("Score: " + score, width / 2, height / 2 + 20);
  text("High Score: " + highScore, width / 2, height / 2 + 60);
}


//--------------------------------------------------
// restartGame Function
//--------------------------------------------------
function restartGame() {
  if (score > highScore) {
    highScore = score;
  }
  gameOver = false;
  waterParticles = [];
  plants = [];
  // Recreate 5 plants equally spaced along the width.
  for (let i = 0; i < 5; i++) {
    let size = random(50, 80);
    let x = (i + 1) * width / 6;
    let y = height - 100 - (size * 0.8) / 2 + 30;
    plants.push(new Plant(x, y, size));
  }
  startTime = millis();
}


//--------------------------------------------------
// Plant Class (Vertical Growth, Fixed Stem Base, Increasing Decay)
//--------------------------------------------------
class Plant {
  constructor(x, y, size) {
    // this.pos is the fixed bottom center of the plant (base of the trunk)
    this.pos = createVector(x, y);
    this.size = size;         // Base width for the canopy remains constant.
    this.hydration = 1;       // 1 = fully watered (green), 0 = dry (brown)
    // Base decay rate randomized; will be multiplied by vertical scale.
    this.baseDecayRate = random(0.0015, 0.0025);
    // Colors: a warm brown (Peru-like) and a vibrant green.
    this.brownColor = color(205, 133, 63);
    this.greenColor = color(34, 139, 34);
    this.vScale = 1;          // Vertical growth multiplier (canopy height grows).
    // Fixed trunk height relative to size.
    this.trunkHeight = this.size * 0.8;
  }
  
  update() {
    // Effective decay rate increases with vertical growth.
    // let effectiveDecay = this.baseDecayRate * this.vScale/2;
    // let effectiveDecay = this.baseDecayRate * sqrt(this.vScale)/2;
    let effectiveDecay = this.baseDecayRate * log(this.vScale + 10) * this.vScale/3;
    this.hydration = max(0, this.hydration - effectiveDecay);
    
    // If hydration reaches zero, game over.
    if (this.hydration <= 0) {
      gameOver = true;
    }
  }
  
  water(amount) {
    // Increase hydration (capped at 1) and grow the canopy vertically.
    this.hydration = min(1, this.hydration + amount);
    this.vScale += 0.1;
  }
  
  display() {
    push();
      // Draw the trunk. The trunk's bottom remains fixed at this.pos.y.
      let trunkWidth = this.size * 0.2;
      fill(101, 67, 33);
      noStroke();
      rectMode(CENTER);
      // Draw trunk from fixed base upward.
      rect(this.pos.x, this.pos.y - this.trunkHeight/2, trunkWidth, this.trunkHeight);
      
      // Draw the canopy above the trunk.
      let canopyWidth = this.size;  // Fixed width.
      let canopyHeight = this.size * 1.5 * this.vScale;  // Height grows vertically.
      // The canopy's bottom touches the top of the trunk.
      let canopyCenterY = this.pos.y - this.trunkHeight - canopyHeight/2;
      
      // Determine current canopy color based on hydration.
      let currentColor = lerpColor(this.brownColor, this.greenColor, this.hydration);
      fill(currentColor);
      noStroke();
      ellipse(this.pos.x, canopyCenterY, canopyWidth, canopyHeight);
    pop();
  }
}


//--------------------------------------------------
// WaterParticle Class
//--------------------------------------------------
class WaterParticle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    // Give a slight random horizontal drift, and a downward velocity.
    this.vel = createVector(random(-1, 1), random(2, 4));
    this.radius = 8;
    this.gravity = 0.1;
  }
  
  update() {
    // Apply gravity.
    this.vel.y += this.gravity;
    this.pos.add(this.vel);
  }
  
  display() {
    fill(0, 0, 255, 200); // Blue, semi-transparent
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.radius);
  }
  
  offScreen() {
    return this.pos.y - this.radius > height;
  }
  
  hits(plant) {
    // For collision, treat the plant's canopy as a circle with fixed radius = plant.size/2.
    let plantRadius = plant.size / 2;
    let d = dist(this.pos.x, this.pos.y, plant.pos.x, plant.pos.y);
    return (d < plantRadius + this.radius / 2);
  }
}
