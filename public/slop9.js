// Global variables
let board = [];
let columns = 7;
let rows = 10;
let hexRadius; // computed so the grid fits on screen
let currentTile;
let score = 0;
let gameOver = false;
let highscore = 0;
let username = "";
let deviceBlueprint = "";
let showInstructions = true;
let buttonSize = 80; // for game over buttons
let offsetX, offsetY; // offsets to center the hex grid

// Bonus breakdown variables
let bonusField = 0;
let bonusLakes = 0;
let bonusFireLine = 0;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("game-container");
  canvas.style('touch-action', 'none');
  
  // Retrieve user data from localStorage
  let storedData = localStorage.getItem('SlopId');
  if (storedData) {
    let slopData = JSON.parse(storedData);
    username = slopData.slopTag || "";
    deviceBlueprint = slopData.deviceBlueprint || "";
  }
  
  // Calculate hexRadius so that the grid fits.
  let availableHeight = height - 100;
  hexRadius = min( width / (sqrt(3) * (columns - 0.5)), availableHeight / ((3/2) * (rows - 1) + 1) );
  
  // Center the grid
  let gridWidth = hexRadius * sqrt(3) * (columns - 0.5);
  let gridHeight = hexRadius * ((3/2) * (rows - 1) + 1);
  offsetX = (width - gridWidth) / 2;
  offsetY = 100;
  
  // Initialize empty board (rows x columns)
  for (let r = 0; r < rows; r++) {
    board[r] = new Array(columns).fill(null);
  }
  
  spawnNewTile();
  
  // Prevent default scrolling on touch devices
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });
}

// A simple Tile class; note that we no longer draw text on the tile.
class Tile {
  constructor(type) {
    this.type = type;
  }
  
  // Draw the tile at position (x, y) with radius r (color indicates element)
  display(x, y, r) {
    stroke(0);
    fill(getColorForType(this.type));
    drawHexagon(x, y, r);
  }
}

// Spawn a new tile for the player to place (elements: Fire, Water, Earth)
function spawnNewTile() {
  const tileTypes = ["Fire", "Water", "Earth"];
  let type = random(tileTypes);
  currentTile = new Tile(type);
}

// Draw a pointy-top hexagon centered at (x, y) with radius r
function drawHexagon(x, y, r) {
  beginShape();
  for (let i = 0; i < 6; i++) {
    let angle = TWO_PI / 6 * i - PI / 2;
    vertex(x + r * cos(angle), y + r * sin(angle));
  }
  endShape(CLOSE);
}

// Map element types to colors
function getColorForType(type) {
  if (type === "Fire") return color(255, 100, 100);
  if (type === "Water") return color(100, 100, 255);
  if (type === "Earth") return color(100, 255, 100);
  return color(255);
}

// Compute the center coordinates for the hexagon at board cell (row, col)
function getHexCenter(row, col) {
  let x = offsetX + hexRadius * sqrt(3) * (col + 0.5 * (row % 2));
  let y = offsetY + hexRadius * 3/2 * row;
  return { x, y };
}

// Returns neighbor positions (using odd-r offset rules)
function getHexNeighbors(row, col) {
  let neighbors = [];
  if (row % 2 === 0) {
    neighbors.push({row: row - 1, col: col});
    neighbors.push({row: row - 1, col: col - 1});
    neighbors.push({row: row, col: col - 1});
    neighbors.push({row: row, col: col + 1});
    neighbors.push({row: row + 1, col: col});
    neighbors.push({row: row + 1, col: col - 1});
  } else {
    neighbors.push({row: row - 1, col: col});
    neighbors.push({row: row - 1, col: col + 1});
    neighbors.push({row: row, col: col - 1});
    neighbors.push({row: row, col: col + 1});
    neighbors.push({row: row + 1, col: col});
    neighbors.push({row: row + 1, col: col + 1});
  }
  return neighbors;
}

// Helper: DFS to compute contiguous region size for a given element.
function computeRegion(row, col, element, visited) {
  let stack = [{row, col}];
  let size = 0;
  while (stack.length > 0) {
    let cell = stack.pop();
    let r = cell.row, c = cell.col;
    let key = r + "," + c;
    if (visited.has(key)) continue;
    visited.add(key);
    if (board[r][c] === element) {
      size++;
      let neighbors = getHexNeighbors(r, c);
      for (let n of neighbors) {
        if (n.row >= 0 && n.row < rows && n.col >= 0 && n.col < columns) {
          if (board[n.row][n.col] === element && !visited.has(n.row + "," + n.col)) {
            stack.push(n);
          }
        }
      }
    }
  }
  return size;
}

// Compute bonus for the largest contiguous region of Earth tiles ("largest field")
function computeLargestFieldBonus() {
  let visited = new Set();
  let largest = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      if (board[r][c] === "Earth" && !visited.has(r + "," + c)) {
        let size = computeRegion(r, c, "Earth", visited);
        if (size > largest) largest = size;
      }
    }
  }
  // For example, bonus = largest region size × 2.
  return largest * 2;
}

// Compute bonus for water lakes (each contiguous Water region with ≥2 tiles)
function computeWaterLakeBonus() {
  let visited = new Set();
  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      if (board[r][c] === "Water" && !visited.has(r + "," + c)) {
        let size = computeRegion(r, c, "Water", visited);
        if (size >= 2) {
          count++;
        }
      }
    }
  }
  // For example, bonus = count × 3.
  return count * 3;
}

// Compute bonus for the longest contiguous line of Fire tiles.
// We examine three principal axial directions: (1,0), (0,1), and (1,-1).
function computeLongestFireLineBonus() {
  // Helper to convert odd-r offset to axial coordinates.
  function offsetToAxial(row, col) {
    let q = col - floor(row / 2);
    let r_axial = row;
    return { q, r: r_axial };
  }
  
  let maxLine = 0;
  let directions = [{q: 1, r: 0}, {q: 0, r: 1}, {q: 1, r: -1}];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      if (board[r][c] === "Fire") {
        let axial = offsetToAxial(r, c);
        for (let d of directions) {
          // Only count if this cell is the start of a line in this direction.
          let prevAxial = { q: axial.q - d.q, r: axial.r - d.r };
          let prevOffset = axialToOffset(prevAxial.q, prevAxial.r);
          if (prevOffset.row >= 0 && prevOffset.row < rows && prevOffset.col >= 0 && prevOffset.col < columns) {
            if (board[prevOffset.row][prevOffset.col] === "Fire") {
              continue;
            }
          }
          // Count contiguous Fire tiles along direction d.
          let lineLength = 0;
          let currentAxial = { q: axial.q, r: axial.r };
          while (true) {
            let offset = axialToOffset(currentAxial.q, currentAxial.r);
            if (offset.row < 0 || offset.row >= rows || offset.col < 0 || offset.col >= columns) break;
            if (board[offset.row][offset.col] === "Fire") {
              lineLength++;
              currentAxial.q += d.q;
              currentAxial.r += d.r;
            } else {
              break;
            }
          }
          if (lineLength > maxLine) maxLine = lineLength;
        }
      }
    }
  }
  // For example, bonus = longest line length × 4.
  return maxLine * 4;
}

// Convert axial coordinates back to odd-r offset
function axialToOffset(q, r) {
  let col = q + floor(r / 2);
  return { row: r, col: col };
}

// Draw the current hex grid and any placed tiles (without text)
function drawBoard() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      let center = getHexCenter(r, c);
      stroke(0);
      fill(200);
      drawHexagon(center.x, center.y, hexRadius);
      if (board[r][c] != null) {
        fill(getColorForType(board[r][c]));
        drawHexagon(center.x, center.y, hexRadius);
      }
    }
  }
}

// Calculate the total score based on base score and bonuses
function calculateTotalScore() {
  // Calculate bonuses
  bonusField = computeLargestFieldBonus();
  bonusLakes = computeWaterLakeBonus();
  bonusFireLine = computeLongestFireLineBonus();
  
  // Count placed tiles for base score
  let placedTiles = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      if (board[r][c] !== null) {
        placedTiles++;
      }
    }
  }
  
  // Total score is base score (1 per tile) plus bonuses
  return placedTiles + bonusField + bonusLakes + bonusFireLine;
}

// Check if the board is full (no empty cells remain)
function isBoardFull() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      if (board[r][c] === null) return false;
    }
  }
  return true;
}

function draw() {
  background(135, 206, 235);
  
  if (gameOver) {
    drawGameOver();
    return;
  }
  
  drawBoard();
  
  // Display score and instructions
  fill(0);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("Score: " + score, width / 2, 30);
  
  // Display bonus breakdown
  textSize(16);
  textAlign(LEFT, CENTER);
  text("Field: " + bonusField, 20, 90);
  text("Lakes: " + bonusLakes, 20, 110);
  text("Fire Line: " + bonusFireLine, 20, 130);
  
  if (showInstructions) {
    fill(0);
    textSize(18);
    textAlign(CENTER, CENTER);
    text("Tap an empty hex cell to place your tile!", width / 2, 60);
  }
  
  // Display current tile in a fixed area (top left)
  if (currentTile) {
    fill(0);
    textSize(24);
    textAlign(LEFT, CENTER);
    text("Current Tile:", 20, 50);
    currentTile.display(120, 50, hexRadius);
  }
}

function mousePressed() {
  if (gameOver) {
    // Restart button
    if (mouseX > width / 2 - 180 && mouseX < width / 2 - 20 &&
        mouseY > height / 2 + 140 && mouseY < height / 2 + 190) {
      resetGame();
      return;
    }
    // Leaderboard button
    if (mouseX > width / 2 + 20 && mouseX < width / 2 + 180 &&
        mouseY > height / 2 + 140 && mouseY < height / 2 + 190) {
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
  
  // Place current tile on tapped hex cell
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      let center = getHexCenter(r, c);
      let d = dist(mouseX, mouseY, center.x, center.y);
      if (d < hexRadius && board[r][c] === null) {
        board[r][c] = currentTile.type;
        
        // Recalculate score after each tile placement
        score = calculateTotalScore();
        
        spawnNewTile();
        
        if (isBoardFull()) {
          gameOver = true;
        }
        
        showInstructions = false;
        return;
      }
    }
  }
}

function resetGame() {
  score = 0;
  gameOver = false;
  board = [];
  bonusField = 0;
  bonusLakes = 0;
  bonusFireLine = 0;
  for (let r = 0; r < rows; r++) {
    board[r] = new Array(columns).fill(null);
  }
  spawnNewTile();
}

function keyPressed() {
  // Optionally, add keyboard input if desired.
}

function touchStarted() { mousePressed(); return false; }
function touchEnded() { return false; }

async function submitScore(username, score, deviceBlueprint) {
  const data = { 
    username, 
    highScore: score, 
    deviceBlueprint,
    gameId: 9  // Specify gameId as 9 for slop9
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
      fetchLeaderboard(9, 5, 'leaderboard-list');
    }
    return responseData;
  } catch (error) {
    console.error("Error submitting score:", error);
    return null;
  }
}

function drawGameOver() {
  fill(0, 150);
  rect(0, 0, width, height);
  fill(255);
  textSize(48);
  textAlign(CENTER, CENTER);
  text(`Game Over, ${username}`, width / 2, height / 2 - 120);
  textSize(32);
  text("Score: " + score, width / 2, height / 2 - 60);
  
  // Display bonus breakdown
  textSize(24);
  text("Field Bonus: " + bonusField, width / 2, height / 2 - 20);
  text("Lake Bonus: " + bonusLakes, width / 2, height / 2 + 20);
  text("Fire Line Bonus: " + bonusFireLine, width / 2, height / 2 + 60);
  
  if (score > highscore) {
    highscore = score;
  }
  text("Highscore: " + highscore, width / 2, height / 2 + 100);
  
  // Draw Sloppy Seconds and Leaderboard buttons
  fill(50, 150, 250);
  rectMode(CENTER);
  rect(width / 2 - 100, height / 2 + 165, 160, 50, 10);
  fill(255);
  textSize(20);
  textAlign(CENTER, CENTER);
  text("Sloppy Seconds?", width / 2 - 100, height / 2 + 165);
  
  fill(50, 150, 250);
  rect(width / 2 + 100, height / 2 + 165, 160, 50, 10);
  fill(255);
  textSize(20);
  text("Leaderboard", width / 2 + 100, height / 2 + 165);
  
  rectMode(CORNER); // Reset rectMode to default
}
