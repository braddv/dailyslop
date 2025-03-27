let stationLeft, stationRight;
let enemyMissiles = [];
let playerMissiles = [];
let lastEnemySpawnTime = 0;
let enemySpawnInterval = 1500; // in milliseconds
let score = 0;
let gameOver = false;
let highscore = 0;
let username = "";
let deviceBlueprint = "";
let showInstructions = true;

let groundLevel;

// Variables for swipe detection
let swipeStartX = null;
let swipeStartY = null;
let activeStation = null;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("game-container");
  canvas.style('touch-action', 'none');
  
  // Load user data from localStorage
  let storedData = localStorage.getItem('SlopId');
  if (storedData) {
    let slopData = JSON.parse(storedData);
    username = slopData.slopTag || "";
    deviceBlueprint = slopData.deviceBlueprint || "";
  }
  
  groundLevel = height - 50;
  // Create two fixed missile command stations
  stationLeft = new Station(width * 0.25, groundLevel);
  stationRight = new Station(width * 0.75, groundLevel);
  
  // Prevent default touch actions on Safari.
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });
}

function draw() {
  background(20); // Dark background for a Missile Command look
  
  // Draw the ground
  fill(80);
  noStroke();
  rect(0, groundLevel, width, height - groundLevel);
  
  // Display game instructions until the player swipes
  if (showInstructions) {
    fill(255);
    textSize(18);
    textAlign(CENTER, TOP);
    text("Swipe upward from a station to fire a missile", width / 2, 40);
  }
  
  if (gameOver) {
    drawGameOver();
    return;
  }
  
  // Spawn enemy missiles at regular intervals
  if (millis() - lastEnemySpawnTime > enemySpawnInterval) {
    enemyMissiles.push(new EnemyMissile());
    lastEnemySpawnTime = millis();
  }
  
  // Update and display enemy missiles
  for (let i = enemyMissiles.length - 1; i >= 0; i--) {
    enemyMissiles[i].update();
    enemyMissiles[i].display();
    // End the game if an enemy missile reaches the ground
    if (enemyMissiles[i].pos.y >= groundLevel) {
      gameOver = true;
    }
    if (enemyMissiles[i].offScreen()) {
      enemyMissiles.splice(i, 1);
    }
  }
  
  // Update and display player missiles
  for (let i = playerMissiles.length - 1; i >= 0; i--) {
    playerMissiles[i].update();
    playerMissiles[i].display();
    if (playerMissiles[i].offScreen()) {
      playerMissiles.splice(i, 1);
    }
  }
  
  // Display the two missile command stations
  stationLeft.display();
  stationRight.display();
  
  // Check for collisions: if a player missile hits an enemy missile, remove both and increment score.
  for (let i = enemyMissiles.length - 1; i >= 0; i--) {
    for (let j = playerMissiles.length - 1; j >= 0; j--) {
      let d = dist(enemyMissiles[i].pos.x, enemyMissiles[i].pos.y, playerMissiles[j].pos.x, playerMissiles[j].pos.y);
      if (d < 15) {
        enemyMissiles.splice(i, 1);
        playerMissiles.splice(j, 1);
        score++;
        break;
      }
    }
  }
  
  // Display the score at the top
  fill(255);
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
  text(`Game Over, ${username}`, width / 2, height / 2 - 60);
  textSize(32);
  text("Score: " + score, width / 2, height / 2 - 20);
  text("Highscore: " + highscore, width / 2, height / 2 + 20);
  
  // Restart button
  fill(50, 150, 250);
  rectMode(CENTER);
  rect(width / 2 - 100, height / 2 + 80, 160, 50, 10);
  fill(255);
  textSize(20);
  text("Sloppy Seconds?", width / 2 - 100, height / 2 + 80);
  
  // Leaderboard button
  fill(50, 150, 250);
  rect(width / 2 + 100, height / 2 + 80, 160, 50, 10);
  fill(255);
  textSize(20);
  text("Leaderboard", width / 2 + 100, height / 2 + 80);
  
  rectMode(CORNER);
}

class Station {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.size = 40; // Diameter of the station
  }
  
  display() {
    fill(200);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.size);
  }
  
  // Check if a given point (x, y) is inside this station
  contains(x, y) {
    return dist(x, y, this.pos.x, this.pos.y) < this.size / 2;
  }
}

class PlayerMissile {
  // Accept an initial position and velocity (if provided)
  constructor(x, y, vx, vy) {
    this.pos = createVector(x, y);
    if (vx !== undefined && vy !== undefined) {
      this.vel = createVector(vx, vy);
    } else {
      this.vel = createVector(0, -7);
    }
    this.size = 8;
  }
  
  update() {
    this.pos.add(this.vel);
  }
  
  display() {
    fill(0, 255, 0);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.size);
  }
  
  offScreen() {
    return (this.pos.y < -10 || this.pos.x < -10 || this.pos.x > width + 10);
  }
}

class EnemyMissile {
  constructor() {
    this.pos = createVector(random(20, width - 20), -10);
    // Slower velocity: random vertical speed between 1 and 3
    this.vel = createVector(0, random(1, 3));
    this.size = 16; // Bigger enemy missile
  }
  
  update() {
    this.pos.add(this.vel);
  }
  
  display() {
    fill(255, 0, 0);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.size);
    // Draw a short trail behind the missile
    stroke(255, 0, 0, 100);
    line(this.pos.x, this.pos.y, this.pos.x, this.pos.y - 10);
    noStroke();
  }
  
  offScreen() {
    return (this.pos.y > groundLevel + 10);
  }
}

// -----------------------------
// Input Handling (swipe detection)
// -----------------------------

// Unified function to handle touch/mouse start events.
function handleStart(x, y) {
  // Check if the touch begins within either station's area.
  if (stationLeft.contains(x, y)) {
    activeStation = stationLeft;
    swipeStartX = x;
    swipeStartY = y;
  } else if (stationRight.contains(x, y)) {
    activeStation = stationRight;
    swipeStartX = x;
    swipeStartY = y;
  } else {
    activeStation = null;
    swipeStartX = null;
    swipeStartY = null;
  }
}

// Unified function to handle touch/mouse end events.
function handleEnd(x, y) {
  if (activeStation !== null && swipeStartX !== null && swipeStartY !== null) {
    let dx = x - swipeStartX;
    let dy = y - swipeStartY;
    let swipeLength = sqrt(dx * dx + dy * dy);
    // Only fire if the swipe is upward (dy negative) and long enough (threshold: 20 pixels)
    if (dy < 0 && swipeLength > 20) {
      // Reduced multiplier factor for slower bullets
      let factor = 0.15;
      let vx = dx * factor;
      let vy = dy * factor;
      // Create a new missile at the station's position.
      playerMissiles.push(new PlayerMissile(activeStation.pos.x, activeStation.pos.y - activeStation.size / 2, vx, vy));
      showInstructions = false;
    }
  }
  // Reset swipe variables
  activeStation = null;
  swipeStartX = null;
  swipeStartY = null;
}

// Use mouse events for desktop
function mousePressed() {
  handleStart(mouseX, mouseY);
}

function mouseReleased() {
  handleEnd(mouseX, mouseY);
}

// Use touch events for mobile
function touchStarted() {
  if (touches.length > 0) {
    handleStart(touches[0].x, touches[0].y);
  }
  return false;
}

function touchEnded() {
  handleEnd(mouseX, mouseY);
  return false;
}

// -----------------------------
// Game Over / Restart and Leaderboard Handling
// -----------------------------
function mouseClicked() {
  if (gameOver) {
    // Restart button area
    if (mouseX > width / 2 - 180 && mouseX < width / 2 - 20 &&
        mouseY > height / 2 + 55 && mouseY < height / 2 + 105) {
      if (score > highscore) {
        highscore = score;
      }
      gameOver = false;
      score = 0;
      enemyMissiles = [];
      playerMissiles = [];
      showInstructions = true;
      return;
    }
    // Leaderboard button area
    if (mouseX > width / 2 + 20 && mouseX < width / 2 + 180 &&
        mouseY > height / 2 + 55 && mouseY < height / 2 + 105) {
      if (score > highscore) {
        highscore = score;
      }
      submitScore(username, highscore, deviceBlueprint);
      document.getElementById('game-container').style.display = 'none';
      document.getElementById('not-game-container').style.display = 'block';
      document.getElementById('play-button').addEventListener('click', function() {
        document.getElementById('not-game-container').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        if (score > highscore) {
          highscore = score;
        }
        gameOver = false;
        score = 0;
        enemyMissiles = [];
        playerMissiles = [];
        showInstructions = true;
      });
      document.getElementById('play-button').addEventListener('touchend', function() {
        document.getElementById('not-game-container').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        if (score > highscore) {
          highscore = score;
        }
        gameOver = false;
        score = 0;
        enemyMissiles = [];
        playerMissiles = [];
        showInstructions = true;
      });
      const homeButton = document.getElementById('home-button');
      homeButton.addEventListener('click', navigateHome);
      homeButton.addEventListener('touchend', navigateHome);
      return;
    }
  }
}

// -----------------------------
// Leaderboard submission and navigation
// -----------------------------
async function submitScore(username, score, deviceBlueprint) {
  const data = {
    username,
    highScore: score,
    deviceBlueprint,
    gameId: 6 
  };

  try {
    const response = await fetch("/api/submit-score", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const responseData = await response.json();
    console.log("Score submitted successfully:", responseData);
    if (typeof fetchLeaderboard === 'function') {
      fetchLeaderboard(6, 5, 'leaderboard-list');
    }
    return responseData;
  } catch (error) {
    console.error("Error submitting score:", error);
    return null;
  }
}

function navigateHome(e) {
  e.preventDefault();
  window.location.href = '/';
}
