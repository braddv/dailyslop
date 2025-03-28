// Core variables preserved from the original framework
let score = 0;
let gameOver = false;
let highscore = 0;
let username = "";
let deviceBlueprint = "";
let showInstructions = true;
let buttonSize = 80; // used for game-over buttons

// New game variables
let boat;
let ripples = [];
let goalPosts = [];
let currentGoalIndex = 0;
let startTime;
let win = false; // Flag to indicate win condition

// Scoring parameters (in seconds)
const decayFastTime = 10;    // first 10 seconds: 1000 to 500
const decaySlowTime = 600;   // 10 minutes (600 sec): 500 to 10

// Helper function to compute score based on elapsed time (in seconds)
function computeScore(t) {
  if (t <= decayFastTime) {
    // Linear decay from 1000 to 500 in the first 10 seconds.
    return 1000 - 50 * t; // (1000 at t=0, 500 at t=10)
  } else if (t <= decaySlowTime) {
    // Linear decay from 500 at t=10 to 10 at t=600.
    // Total drop: 500 - 10 = 490 points over (600 - 10) = 590 seconds.
    return 500 - (490 / 590) * (t - decayFastTime);
  } else {
    // After 600 seconds, continue decaying linearly from 10 to 0.
    // Here we assume a further linear drop to 0 at 1200 seconds (20 minutes total).
    let extraTime = 1200 - decaySlowTime; // 600 seconds for the extra decay
    return max(0, 10 - (10 / extraTime) * (t - decaySlowTime));
  }
}

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("game-container");
  canvas.style('touch-action', 'none');
  
  // Retrieve user data from localStorage (as before)
  let storedData = localStorage.getItem('SlopId');
  if (storedData) {
    let slopData = JSON.parse(storedData);
    username = slopData.slopTag || "";
    deviceBlueprint = slopData.deviceBlueprint || "";
  }
  
  resetGame();
  
  // Prevent default scrolling on touch devices
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });
}

function resetGame() {
  score = 0;
  gameOver = false;
  win = false;
  currentGoalIndex = 0;
  ripples = [];
  startTime = millis();
  
  // Initialize boat starting near the bottom center
  boat = new Boat(width / 2, height - 100);
  
  // Create the fixed goal posts arranged in a circle
  initGoalPosts();
}

function initGoalPosts() {
  goalPosts = [];
  let centerX = width / 2;
  let centerY = height / 2;
  let circleRadius = min(width, height) / 3;
  let numPosts = 5;
  for (let i = 0; i < numPosts; i++) {
    // Arrange posts evenly around a circle (starting at the top)
    let angle = TWO_PI / numPosts * i - HALF_PI;
    let x = centerX + circleRadius * cos(angle);
    let y = centerY + circleRadius * sin(angle);
    goalPosts.push({ pos: createVector(x, y), id: i + 1 });
  }
}

class Boat {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.size = 40;
  }
  
  update() {
    // Update position using current velocity
    this.pos.add(this.vel);
    // Apply friction to gradually slow the boat down
    this.vel.mult(0.99);
    
    // If the boat leaves the canvas before winning, game over with no score.
    if (this.pos.x < 0 || this.pos.x > width ||
        this.pos.y < 0 || this.pos.y > height) {
      gameOver = true;
      score = 0;
    }
  }
  
  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    // Use velocity to determine orientation (default to 0 if nearly stationary)
    let angle = this.vel.mag() > 0.1 ? this.vel.heading() : 0;
    rotate(angle);
    fill(255, 0, 0);
    noStroke();
    // Draw a simple boat as a triangle (pointing in the moving direction)
    triangle(this.size, 0, -this.size / 2, this.size / 2, -this.size / 2, -this.size / 2);
    pop();
  }
}

class Ripple {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.radius = 0;
    this.maxRadius = 150;
    this.speed = 3;
    this.active = true;
  }
  
  update() {
    this.radius += this.speed;
    if (this.radius > this.maxRadius) {
      this.active = false;
    }
  }
  
  draw() {
    noFill();
    // Fade the ripple as it expands
    stroke(255, 255, 255, map(this.radius, 0, this.maxRadius, 255, 0));
    strokeWeight(2);
    ellipse(this.pos.x, this.pos.y, this.radius * 2);
  }
  
  // If the boat is near the edge of the ripple, apply a push.
  affectBoat(boat) {
    let d = dist(boat.pos.x, boat.pos.y, this.pos.x, this.pos.y);
    let threshold = 10;
    if (abs(d - this.radius) < threshold) {
      // Push the boat away from the ripple's center
      let force = p5.Vector.sub(boat.pos, this.pos);
      force.normalize();
      force.mult(0.5);
      boat.vel.add(force);
    }
  }
}

function drawGoalPosts() {
  for (let i = 0; i < goalPosts.length; i++) {
    let gp = goalPosts[i];
    // Highlight the current goal post that the boat must pass through next
    if (i === currentGoalIndex) {
      fill(0, 255, 0);
    } else {
      fill(255);
    }
    noStroke();
    ellipse(gp.pos.x, gp.pos.y, 40, 40);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(gp.id, gp.pos.x, gp.pos.y);
  }
}

// Called when the boat successfully passes the last goal post.
function winGame() {
  let elapsedSec = (millis() - startTime) / 1000;
  // Compute final score using our custom decay function.
  score = computeScore(elapsedSec);
  win = true;
  gameOver = true;
}

function draw() {
  // Draw water background
  background(30, 144, 255);
  
  if (gameOver) {
    drawGameOver();
    return;
  }
  
  // Update and draw the boat
  boat.update();
  boat.draw();
  
  // Update and draw all active ripples and apply their effect on the boat
  for (let i = ripples.length - 1; i >= 0; i--) {
    let r = ripples[i];
    r.update();
    r.draw();
    r.affectBoat(boat);
    if (!r.active) {
      ripples.splice(i, 1);
    }
  }
  
  // Check if the boat has passed through the current goal post (if any remain)
  if (currentGoalIndex < goalPosts.length) {
    let currentGoal = goalPosts[currentGoalIndex];
    if (dist(boat.pos.x, boat.pos.y, currentGoal.pos.x, currentGoal.pos.y) < 30) {
      currentGoalIndex++;
      // If all goal posts have been passed, the player wins.
      if (currentGoalIndex === goalPosts.length) {
        winGame();
      }
    }
  }
  
  // Draw the fixed goal posts
  drawGoalPosts();
  
  // Instead of showing time, compute and display the live score based on elapsed time.
  let elapsedSec = (millis() - startTime) / 1000;
  let liveScore = floor(computeScore(elapsedSec));
  fill(255);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("Score: " + liveScore, width / 2, 30);
  
  if (showInstructions) {
    fill(255);
    textSize(18);
    text("Tap to create ripples and steer the boat through the goals in order!", width / 2, 60);
  }
}

function mousePressed() {
  if (gameOver) {
    // When game is over, handle "Play Again" or "Leaderboard" buttons.
    if (mouseX > width / 2 - 180 && mouseX < width / 2 - 20 &&
        mouseY > height / 2 + 55 && mouseY < height / 2 + 105) {
      resetGame();
      return;
    }
    if (mouseX > width / 2 + 20 && mouseX < width / 2 + 180 &&
        mouseY > height / 2 + 55 && mouseY < height / 2 + 105) {
      submitScore(username, highscore, deviceBlueprint);
      document.getElementById('game-container').style.display = 'none';
      document.getElementById('not-game-container').style.display = 'block';
      document.getElementById('play-button').addEventListener('click', function() {
        document.getElementById('not-game-container').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        resetGame();
      });
      return;
    }
    return;
  }
  
  // During gameplay, tapping creates a ripple at the tap location.
  ripples.push(new Ripple(mouseX, mouseY));
  if (showInstructions) showInstructions = false;
}

function touchStarted() {
  mousePressed();
  return false;
}

function drawGameOver() {
  fill(0, 150);
  rect(0, 0, width, height);
  fill(255);
  textSize(48);
  textAlign(CENTER, CENTER);
  
  // Display a win or loss message
  if (win) {
    text(`You Win, ${username}!`, width / 2, height / 2 - 60);
    textSize(32);
    text("Score: " + score, width / 2, height / 2 - 20);
  } else {
    text(`Game Over, ${username}`, width / 2, height / 2 - 60);
    textSize(32);
    text("Score: " + score, width / 2, height / 2 - 20);
  }
  
  if (score > highscore) {
    highscore = score;
  }
  text("Highscore: " + highscore, width / 2, height / 2 + 20);
  
  // Draw "Play Again" and "Leaderboard" buttons
  fill(50, 150, 250);
  rectMode(CENTER);
  rect(width / 2 - 100, height / 2 + 80, 160, 50, 10);
  fill(255);
  textSize(20);
  text("Play Again", width / 2 - 100, height / 2 + 80);
  
  fill(50, 150, 250);
  rect(width / 2 + 100, height / 2 + 80, 160, 50, 10);
  fill(255);
  textSize(20);
  text("Leaderboard", width / 2 + 100, height / 2 + 80);
  
  rectMode(CORNER);
}

// Leaderboard submission function (preserved from your original framework)
async function submitScore(username, score, deviceBlueprint) {
  const data = { 
    username, 
    highScore: Math.ceil(score), 
    deviceBlueprint,
    gameId: 7
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
      fetchLeaderboard(7, 5, 'leaderboard-list');
    }
    return responseData;
  } catch (error) {
    console.error("Error submitting score:", error);
    return null;
  }
}
