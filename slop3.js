// =======================
// Global Variables and Setup
// =======================
let grid = [];
let rows, cols;
let cellSize = 20;
let player;
let enemies = [];
let numEnemies = 5;  // Total enemy count (5 enemies)
let score = 0;
let highscore = 0;
let gameOver = false;

const buttonSize = 80; // Size for touch buttons
const margin = 20;     // Margin from canvas edges

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  // Disable default touch actions for compatibility.
  canvas.style('touch-action', 'none');

  cols = floor(width / cellSize);
  // Subtract 9 rows from the gameplay area.
  rows = floor(height / cellSize) - 9;
  
  // Initialize grid with dirt (1 represents dirt, 0 is dug-out).
  for (let i = 0; i < rows; i++) {
    grid[i] = [];
    for (let j = 0; j < cols; j++) {
      grid[i][j] = 1;
    }
  }

  // Position player roughly at the center of the gameplay area and clear only that cell.
  player = { x: floor(cols / 2), y: floor(rows / 2) };
  clearCell(player.x, player.y);

  // Spawn initial enemies in fixed positions:
  // Middle left, Top middle, Middle right, Top left, and Top right.
  let middleRow = floor(rows / 2);
  let middleCol = floor(cols / 2);
  enemies = [
    { x: 0, y: middleRow },         // Middle left
    { x: middleCol, y: 0 },           // Top middle
    { x: cols - 1, y: middleRow },    // Middle right
    { x: 0, y: 0 },                  // Top left
    { x: cols - 1, y: 0 }             // Top right
  ];
  // Clear enemy cells to allow movement.
  for (let enemy of enemies) {
    clearCell(enemy.x, enemy.y);
  }

  // Prevent default scrolling on touch devices.
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });
}

// =======================
// Main Draw Loop and Input Handling
// =======================
function draw() {
  background(0);
  
  // Draw the grid: only the top "rows" are part of the gameplay.
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === 1) {
        fill(139, 69, 19); // Dirt color
      } else {
        fill(50);         // Dug-out (tunnel) color
      }
      rect(j * cellSize, i * cellSize, cellSize, cellSize);
    }
  }
  
  // Draw the player as a green circle.
  fill(0, 255, 0);
  ellipse(player.x * cellSize + cellSize / 2, player.y * cellSize + cellSize / 2, cellSize * 0.8);
  
  // Draw enemies as red squares.
  fill(255, 0, 0);
  for (let e of enemies) {
    rect(e.x * cellSize, e.y * cellSize, cellSize, cellSize);
  }
  
  // Display the current score.
  fill(255);
  textSize(32);
  textAlign(LEFT, TOP);
  text("Score: " + score, 10, 10);
  
  // Draw on-screen touch control buttons.
  drawButtons();
  
  // If game over, show an overlay.
  if (gameOver) {
    fill(0, 150);
    rect(0, 0, width, height);
    fill(255);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("Game Over", width / 2, height / 2 - 40);
    textSize(32);
    text("Score: " + score, width / 2, height / 2);
    text("Highscore: " + highscore, width / 2, height / 2 + 40);
    textSize(24);
    text("Tap to restart", width / 2, height / 2 + 80);
    noLoop();
  }
}

function drawButtons() {
  // LEFT SIDE BUTTONS (Up and Left)
  let leftUpX = margin;
  let leftUpY = height - 2 * buttonSize - margin;
  fill(50, 150, 250);
  rect(leftUpX, leftUpY, buttonSize, buttonSize, 10);
  fill(255);
  textSize(20);
  textAlign(CENTER, CENTER);
  text("Up", leftUpX + buttonSize / 2, leftUpY + buttonSize / 2);
  
  let leftLeftX = margin;
  let leftLeftY = height - buttonSize - margin;
  fill(50, 150, 250);
  rect(leftLeftX, leftLeftY, buttonSize, buttonSize, 10);
  fill(255);
  text("Left", leftLeftX + buttonSize / 2, leftLeftY + buttonSize / 2);
  
  // RIGHT SIDE BUTTONS (Down and Right)
  let rightDownX = width - buttonSize - margin;
  let rightDownY = height - 2 * buttonSize - margin;
  fill(50, 150, 250);
  rect(rightDownX, rightDownY, buttonSize, buttonSize, 10);
  fill(255);
  text("Down", rightDownX + buttonSize / 2, rightDownY + buttonSize / 2);
  
  let rightRightX = width - buttonSize - margin;
  let rightRightY = height - buttonSize - margin;
  fill(50, 150, 250);
  rect(rightRightX, rightRightY, buttonSize, buttonSize, 10);
  fill(255);
  text("Right", rightRightX + buttonSize / 2, rightRightY + buttonSize / 2);
}

function mousePressed() {
  // Restart if game over.
  if (gameOver) {
    restartGame();
    return;
  }
  
  // Check if the tap is on one of the control buttons.
  if (mouseX >= margin && mouseX <= margin + buttonSize &&
      mouseY >= height - 2 * buttonSize - margin && mouseY <= height - 2 * buttonSize - margin + buttonSize) {
    handleMove("up");
    return;
  }
  if (mouseX >= margin && mouseX <= margin + buttonSize &&
      mouseY >= height - buttonSize - margin && mouseY <= height - margin) {
    handleMove("left");
    return;
  }
  if (mouseX >= width - buttonSize - margin && mouseX <= width - margin &&
      mouseY >= height - 2 * buttonSize - margin && mouseY <= height - 2 * buttonSize - margin + buttonSize) {
    handleMove("down");
    return;
  }
  if (mouseX >= width - buttonSize - margin && mouseX <= width - margin &&
      mouseY >= height - buttonSize - margin && mouseY <= height - margin) {
    handleMove("right");
    return;
  }
}

function touchStarted() {
  mousePressed();
  return false;
}

// =======================
// Game Logic and Helper Functions
// =======================
function handleMove(direction) {
  if (gameOver) return;
  let newX = player.x;
  let newY = player.y;
  
  if (direction === "up") {
    newY--;
  } else if (direction === "left") {
    newX--;
  } else if (direction === "down") {
    newY++;
  } else if (direction === "right") {
    newX++;
  }
  
  // Boundary check.
  if (newX < 0 || newX >= cols || newY < 0 || newY >= rows) return;
  
  // If the cell is dirt (uneaten), add one to the score.
  if (grid[newY][newX] === 1) {
    score++;
  }
  
  // Move the player.
  player.x = newX;
  player.y = newY;
  
  // Clear only the cell the player moves into.
  clearCell(newX, newY);
  
  // Check if the player collides with any enemy.
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].x === player.x && enemies[i].y === player.y) {
      gameOver = true;
    }
  }
  
  // Move enemies after the player's move.
  moveEnemies();
}

function moveEnemies() {
  // Each enemy now either moves one square closer to the player (25% chance)
  // or moves in a random direction (75% chance).
  // In either case, the enemy "eats" (clears) the block in the destination cell.
  for (let e of enemies) {
    let newX = e.x;
    let newY = e.y;
    
    if (random() < 0.5) {
      // Move one square closer to the player.
      let dx = player.x - e.x;
      let dy = player.y - e.y;
      if (abs(dx) > abs(dy)) {
        newX += (dx > 0 ? 1 : -1);
      } else if (abs(dy) > abs(dx)) {
        newY += (dy > 0 ? 1 : -1);
      } else {
        // If equal, randomize the axis.
        if (random() < 0.5) {
          newX += (dx > 0 ? 1 : -1);
        } else {
          newY += (dy > 0 ? 1 : -1);
        }
      }
    } else {
      // Move in a random direction.
      let directions = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }
      ];
      let d = random(directions);
      newX += d.x;
      newY += d.y;
    }
    
    // Constrain new position within the grid.
    newX = constrain(newX, 0, cols - 1);
    newY = constrain(newY, 0, rows - 1);
    
    // Enemy "eats" the block in the destination cell if it's still dirt.
    if (grid[newY][newX] === 1) {
      clearCell(newX, newY);
    }
    
    // Update enemy position.
    e.x = newX;
    e.y = newY;
    
    // End game if enemy collides with the player.
    if (e.x === player.x && e.y === player.y) {
      gameOver = true;
    }
  }
}

function clearCell(x, y) {
  if (x >= 0 && x < cols && y >= 0 && y < rows) {
    grid[y][x] = 0;
  }
}

// =======================
// Game Restart with Fixed Enemy Positions
// =======================
function restartGame() {
  if (score > highscore) {
    highscore = score;
  }
  score = 0;
  gameOver = false;
  grid = [];
  enemies = [];
  
  // Reinitialize the grid.
  for (let i = 0; i < rows; i++) {
    grid[i] = [];
    for (let j = 0; j < cols; j++) {
      grid[i][j] = 1;
    }
  }
  
  // Reset player position and clear only that cell.
  player.x = floor(cols / 2);
  player.y = floor(rows / 2);
  clearCell(player.x, player.y);
  
  // Spawn initial enemies in fixed positions:
  // Middle left, Top middle, Middle right, Top left, and Top right.
  let middleRow = floor(rows / 2);
  let middleCol = floor(cols / 2);
  enemies = [
    { x: 0, y: middleRow },         // Middle left
    { x: middleCol, y: 0 },           // Top middle
    { x: cols - 1, y: middleRow },    // Middle right
    { x: 0, y: 0 },                  // Top left
    { x: cols - 1, y: 0 }             // Top right
  ];
  // Clear enemy cells to allow movement.
  for (let enemy of enemies) {
    clearCell(enemy.x, enemy.y);
  }
  
  loop();
}
