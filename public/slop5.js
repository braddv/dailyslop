let player;
let lanes = [];
let currentLane = 1; // 0: left, 1: center, 2: right
let items = []; // Holds both hazards (enemies) and collectibles
let baseSpawnInterval = 1500; // Base spawn interval in milliseconds
let spawnInterval = baseSpawnInterval; // This will decrease over time
let lastSpawnTime = 0;
let score = 0;
let gameOver = false;
let highscore = 0;  // Global highscore variable
let username = "";
let deviceBlueprint = "";
let buttonSize = 80;
let showInstructions = true;  // Show instructions until first move

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("game-container");
  canvas.style('touch-action', 'none');

  // Retrieve stored user data.
  let storedData = localStorage.getItem('SlopId');
  if (storedData) {
    let slopData = JSON.parse(storedData);
    username = slopData.slopTag || "";
    deviceBlueprint = slopData.deviceBlueprint || "";
  }
  
  // Define three lanes.
  lanes = [width / 4, width / 2, (3 * width) / 4];
  
  // Initialize player in the center lane near the bottom.
  currentLane = 1;
  player = new Player(lanes[currentLane], height - 100);
}

function draw() {
  background(135, 206, 235); // Sky blue background

  // Draw lane divider lines.
  let divider1 = (lanes[0] + lanes[1]) / 2;
  let divider2 = (lanes[1] + lanes[2]) / 2;
  stroke(255);
  strokeWeight(2);
  line(divider1, 0, divider1, height);
  line(divider2, 0, divider2, height);
  noStroke();

  if (gameOver) {
    drawGameOver();
    return;
  }
  
  // Increase difficulty: decrease spawn interval faster.
  // Minimum spawn interval is 200ms.
  spawnInterval = max(200, baseSpawnInterval - score * 20);

  // Spawn an item (hazard or collectible) at regular intervals.
  if (millis() - lastSpawnTime > spawnInterval) {
    // 60% chance to spawn a hazard (enemy) and 40% chance for a collectible.
    if (random() < 0.6) {
      items.push(new Obstacle());
    } else {
      items.push(new Collectible());
    }
    lastSpawnTime = millis();
  }
  
  // Update and display each item.
  for (let i = items.length - 1; i >= 0; i--) {
    items[i].update();
    items[i].display();
    
    // Remove item if it leaves the canvas.
    if (items[i].offScreen()) {
      if (items[i] instanceof Obstacle) {
        // Award score for dodging a hazard.
        score++;
      }
      items.splice(i, 1);
      continue;
    }
    
    // Check collision with the player.
    if (items[i].hits(player)) {
      if (items[i] instanceof Obstacle) {
        gameOver = true;
      } else if (items[i] instanceof Collectible) {
        // Increase score by 5 when a collectible is collected.
        score += 5;
      }
      items.splice(i, 1);
    }
  }
  
  // Display the player.
  player.display();
  
  // Display the score.
  fill(0);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("Score: " + score, width / 2, 30);
  
  // Draw left/right control buttons.
  drawButtons();
}

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 40;
  }
  
  display() {
    // Draw the player as a black square.
    fill(0);
    noStroke();
    rectMode(CENTER);
    rect(this.x, this.y, this.size, this.size);
    rectMode(CORNER);
  }
  
  moveLeft() {
    if (showInstructions) showInstructions = false;
    if (currentLane > 0) {
      currentLane--;
      this.x = lanes[currentLane];
    }
  }
  
  moveRight() {
    if (showInstructions) showInstructions = false;
    if (currentLane < lanes.length - 1) {
      currentLane++;
      this.x = lanes[currentLane];
    }
  }
}

class Obstacle {
  // Hazards are drawn as blue circles.
  constructor() {
    this.laneIndex = floor(random(0, lanes.length));
    this.x = lanes[this.laneIndex];
    this.y = -50; // Start above the canvas.
    this.size = 40;
    // Increase speed faster based on score.
    this.speed = 5 + score * 0.2;
  }
  
  update() {
    this.y += this.speed;
  }
  
  display() {
    fill(0, 0, 255); // Blue color.
    noStroke();
    ellipse(this.x, this.y, this.size);
  }
  
  offScreen() {
    return (this.y - this.size / 2 > height);
  }
  
  hits(player) {
    // Check collision if in the same lane.
    if (this.laneIndex === currentLane) {
      let playerTop = player.y - player.size / 2;
      let playerBottom = player.y + player.size / 2;
      let obstacleTop = this.y - this.size / 2;
      let obstacleBottom = this.y + this.size / 2;
      return (obstacleBottom > playerTop && obstacleTop < playerBottom);
    }
    return false;
  }
}

class Collectible {
  // Collectibles are drawn as gold triangles.
  constructor() {
    this.laneIndex = floor(random(0, lanes.length));
    this.x = lanes[this.laneIndex];
    this.y = -50; // Start above the canvas.
    this.size = 40;
    // Increase speed faster based on score.
    this.speed = 5 + score * 0.2;
  }
  
  update() {
    this.y += this.speed;
  }
  
  display() {
    fill(255, 215, 0); // Gold color.
    noStroke();
    triangle(
      this.x, this.y - this.size / 2,
      this.x - this.size / 2, this.y + this.size / 2,
      this.x + this.size / 2, this.y + this.size / 2
    );
  }
  
  offScreen() {
    return (this.y - this.size / 2 > height);
  }
  
  hits(player) {
    if (this.laneIndex === currentLane) {
      let playerTop = player.y - player.size / 2;
      let playerBottom = player.y + player.size / 2;
      let collectibleTop = this.y - this.size / 2;
      let collectibleBottom = this.y + this.size / 2;
      return (collectibleBottom > playerTop && collectibleTop < playerBottom);
    }
    return false;
  }
}

function drawGameOver() {
  fill(0, 150);
  rect(0, 0, width, height);
  fill(255);
  textSize(48);
  textAlign(CENTER, CENTER);
  text("Game Over, " + username, width / 2, height / 2 - 60);
  textSize(32);
  text("Score: " + score, width / 2, height / 2 - 20);
  text("Highscore: " + highscore, width / 2, height / 2 + 20);
  
  // Draw restart button.
  fill(50, 150, 250);
  rectMode(CENTER);
  rect(width / 2 - 100, height / 2 + 80, 160, 50, 10);
  fill(255);
  textSize(20);
  text("Sloppy Seconds?", width / 2 - 100, height / 2 + 80);
  
  // Draw leaderboard button.
  fill(50, 150, 250);
  rect(width / 2 + 100, height / 2 + 80, 160, 50, 10);
  fill(255);
  textSize(20);
  text("Leaderboard", width / 2 + 100, height / 2 + 80);
  
  rectMode(CORNER);
}

function drawButtons() {
  push();
  rectMode(CORNER);
  // Left button.
  fill(50, 150, 250);
  rect(20, height - buttonSize - 80, buttonSize, buttonSize, 10);
  fill(255);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("←", 20 + buttonSize / 2, height - buttonSize / 2 - 80);
  
  // Right button.
  fill(50, 150, 250);
  rect(width - buttonSize - 20, height - buttonSize - 80, buttonSize, buttonSize, 10);
  fill(255);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("→", width - buttonSize / 2 - 20, height - buttonSize / 2 - 80);
  pop();
}

function mousePressed() {
  if (gameOver) {
    // Restart button.
    if (mouseX > width / 2 - 180 && mouseX < width / 2 - 20 &&
        mouseY > height / 2 + 55 && mouseY < height / 2 + 105) {
      if (score > highscore) {
        highscore = score;
      }
      gameOver = false;
      score = 0;
      items = [];
      currentLane = 1;
      player = new Player(lanes[currentLane], height - 100);
      showInstructions = true;
      return;
    }
    
    // Leaderboard button.
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
        if (score > highscore) { highscore = score; }
        gameOver = false;
        score = 0;
        items = [];
        currentLane = 1;
        player = new Player(lanes[currentLane], height - 100);
        showInstructions = true;
      });
      
      document.getElementById('play-button').addEventListener('touchend', function() {
        document.getElementById('not-game-container').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        if (score > highscore) { highscore = score; }
        gameOver = false;
        score = 0;
        items = [];
        currentLane = 1;
        player = new Player(lanes[currentLane], height - 100);
        showInstructions = true;
      });
      
      const homeButton = document.getElementById('home-button');
      homeButton.addEventListener('click', navigateHome);
      homeButton.addEventListener('touchend', navigateHome);
      
      return;
    }
    return;
  }
  
  // Game is active—check left/right button presses.
  if (mouseX > 20 && mouseX < 20 + buttonSize &&
      mouseY > height - buttonSize - 80 && mouseY < height - 80) {
    player.moveLeft();
  }
  if (mouseX > width - buttonSize - 20 && mouseX < width - 20 &&
      mouseY > height - buttonSize - 80 && mouseY < height - 80) {
    player.moveRight();
  }
}

function touchStarted() {
  mousePressed();
  return false;
}

function mouseReleased() {
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

async function submitScore(username, score, deviceBlueprint) {
  const data = { username, highScore: score, deviceBlueprint, gameId: 5 };  // Specify gameId as 5 for slop5
  try {
    const response = await fetch("/api/submit-score", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log("Score submitted successfully:", responseData);
    if (typeof fetchLeaderboard === 'function') {
      fetchLeaderboard(5, 5, 'leaderboard-list');
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
