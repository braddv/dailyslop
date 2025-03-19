let plants = [];
let waterParticles = [];
let gameOver = false;

let score = 0;
let highScore = 0;
let startTime = 0;
let username = "";
let deviceBlueprint = "";
let buttonSize = 80;

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  // Disable default touch actions for Safari
  cnv.parent("game-container");

  cnv.style('touch-action', 'none');
  document.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });
  
  // Retrieve stored user data
  let storedData = localStorage.getItem('SlopId');
  if (storedData) {
    // Convert the string to an object
    let slopData = JSON.parse(storedData);
    username = slopData.slopTag || "";
    deviceBlueprint = slopData.deviceBlueprint || "";
  }
  
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
  
  // Display score at the top of the screen
  fill(0);
  textSize(32);
  textAlign(CENTER, TOP);
  text("Score: " + Math.floor(score / 100), width / 2, 20); // Convert milliseconds to a more readable score
}

function mousePressed() {
  if (gameOver) {
    // Check if restart button is clicked
    if (mouseX > width / 2 - 180 && mouseX < width / 2 - 20 &&
        mouseY > height / 2 + 55 && mouseY < height / 2 + 105) {
      // Update highscore if needed
      if (score > highScore) {
        highScore = score;
      }
      // Reset the game
      restartGame();
      return false;
    }
    
    // Check if leaderboard button is clicked
    if (mouseX > width / 2 + 20 && mouseX < width / 2 + 180 &&
        mouseY > height / 2 + 55 && mouseY < height / 2 + 105) {
      // Update highscore if needed
      if (score > highScore) {
        highScore = score;
      }
      
      // Submit the score asynchronously
      submitScore(username, Math.floor(highScore / 100), deviceBlueprint);

      // Toggle visibility of game and not-game containers
      document.getElementById('game-container').style.display = 'none';
      document.getElementById('not-game-container').style.display = 'block';
      
      // Add event listener to the play button to show the game again
      document.getElementById('play-button').addEventListener('click', function() {
        document.getElementById('not-game-container').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        // Reset the game
        if (score > highScore) {
          highScore = score;
        }
        restartGame();
      });
      
      document.getElementById('play-button').addEventListener('touchend', function() {
        document.getElementById('not-game-container').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        // Reset the game
        if (score > highScore) {
          highScore = score;
        }
        restartGame();
      });
      
      const homeButton = document.getElementById('home-button');
      homeButton.addEventListener('click', navigateHome);
      homeButton.addEventListener('touchend', navigateHome);
      
      return false;
    }
    
    return false;
  }
  
  createWaterParticles(mouseX, mouseY);
  return false;
}

// Function to navigate to the home page
function navigateHome(e) {
  e.preventDefault(); // Prevent any default behavior
  window.location.href = '/';
}

// Async function to submit score to the backend
async function submitScore(username, score, deviceBlueprint) {
  // Prepare the data to send to the backend
  const data = { 
    username, 
    highScore: score, 
    deviceBlueprint,
    gameId: 2  // Specify gameId as 2 for slop2
  };

  try {
    const response = await fetch("/api/submit-score", {
      method: "POST",
      credentials: "include",  // This ensures credentials are sent and matched with your CORS config.
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
    
    // Fetch updated leaderboard after submitting score
    // Use the shared fetchLeaderboard function from leaderboard.js
    if (typeof fetchLeaderboard === 'function') {
      fetchLeaderboard(2, 5, 'leaderboard-list');
    }
    
    return responseData;
  } catch (error) {
    console.error("Error submitting score:", error);
    return null;
  }
}

function touchStarted() {
  if (gameOver) {
    // Check for touches on each button
    for (let t of touches) {
      // Check if restart button is touched
      if (t.x > width / 2 - 180 && t.x < width / 2 - 20 &&
          t.y > height / 2 + 55 && t.y < height / 2 + 105) {
        // Update highscore if needed
        if (score > highScore) {
          highScore = score;
        }
        // Reset the game
        restartGame();
        return false;
      }
      
      // Check if leaderboard button is touched
      if (t.x > width / 2 + 20 && t.x < width / 2 + 180 &&
          t.y > height / 2 + 55 && t.y < height / 2 + 105) {
        // Update highscore if needed
        if (score > highScore) {
          highScore = score;
        }
        
        // Submit the score asynchronously
        submitScore(username, Math.floor(highScore / 100), deviceBlueprint);

        // Toggle visibility of game and not-game containers
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('not-game-container').style.display = 'block';
        
        // Add event listener to the play button to show the game again
        document.getElementById('play-button').addEventListener('click', function() {
          document.getElementById('not-game-container').style.display = 'none';
          document.getElementById('game-container').style.display = 'block';
          // Reset the game
          if (score > highScore) {
            highScore = score;
          }
          restartGame();
        });
        
        document.getElementById('play-button').addEventListener('touchend', function() {
          document.getElementById('not-game-container').style.display = 'none';
          document.getElementById('game-container').style.display = 'block';
          // Reset the game
          if (score > highScore) {
            highScore = score;
          }
          restartGame();
        });
        
        const homeButton = document.getElementById('home-button');
        homeButton.addEventListener('click', navigateHome);
        homeButton.addEventListener('touchend', navigateHome);
        
        return false;
      }
    }
    
    // If no buttons were touched, restart the game
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
  text("Game Over, " + username, width / 2, height / 2 - 60);
  textSize(32);
  text("Score: " + Math.floor(score / 100), width / 2, height / 2 - 20);
  text("High Score: " + Math.floor(highScore / 100), width / 2, height / 2 + 20);
  
  // Draw restart button
  fill(50, 150, 250);
  rectMode(CENTER);
  rect(width / 2 - 100, height / 2 + 80, 160, 50, 10);
  fill(255);
  textSize(20);
  text("Sloppy Seconds?", width / 2 - 100, height / 2 + 80);
  
  // Draw leaderboard button
  fill(50, 150, 250);
  rect(width / 2 + 100, height / 2 + 80, 160, 50, 10);
  fill(255);
  textSize(20);
  text("Leaderboard", width / 2 + 100, height / 2 + 80);
  
  rectMode(CORNER); // Reset rectMode to default
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
