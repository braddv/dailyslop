let board = [];
let columns = 7;
let rows = 11;
let cellSize;
let xOffset = 0;
let yOffset = 0;
let score = 0;
let gameOver = false;
let highscore = 0;
let username = "";
let deviceBlueprint = "";
let showInstructions = true;
let bloomEffects = [];
let vineEffects = [];
let level = 1;
let tapsLeft = 11;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("game-container");
  canvas.style('touch-action', 'none');

  let storedData = localStorage.getItem('SlopId');
  if (storedData) {
    let slopData = JSON.parse(storedData);
    username = slopData.slopTag || "";
    deviceBlueprint = slopData.deviceBlueprint || "";
  }

  calculateCellSize();
  initializeBoard();

  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
}

function calculateCellSize() {
  // Calculate candidate sizes for width and height.
  let candidateWidth = floor(width / columns);
  let candidateHeight = floor(height / rows);
  // Choose the smaller candidate so that 11 rows always fit.
  cellSize = min(candidateWidth, candidateHeight);
  
  // If the height is the limiting factor, use full height (no top/bottom border)
  // and center horizontally.
  if (cellSize === candidateHeight) {
    yOffset = 0;
    xOffset = floor((width - columns * cellSize) / 2);
  } else {
    // Otherwise, use full width and center vertically.
    xOffset = 0;
    yOffset = floor((height - rows * cellSize) / 2);
  }
}

function initializeBoard() {
  board = Array.from({ length: rows }, () =>
    Array(columns).fill().map(() => ({ stage: "dirt" }))
  );
}

function draw() {
  background(135, 206, 235);

  if (gameOver) return drawGameOver();

  drawBoard();
  drawVineEffects();
  drawBloomEffects();

  fill(255, 250, 200); // light cream for visibility
  textSize(28);
  textAlign(CENTER, CENTER);
  text(`Score: ${score} | Taps: ${tapsLeft} | Level ${level}`, width / 2, 30);

  if (showInstructions) {
    fill(0);
    textSize(18);
    text("Tap to grow. Bloom spreads sprouts and chains!", width / 2, 60);
  }
}

function drawBoard() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const x = c * cellSize + xOffset;
      const y = r * cellSize + yOffset;
      stroke(0);
      fill(getStageColor(board[r][c].stage));
      rect(x, y, cellSize, cellSize);
      fill(0);
      textAlign(CENTER, CENTER);
      textSize(cellSize * 0.3);
      text(board[r][c].stage.charAt(0).toUpperCase(), x + cellSize / 2, y + cellSize / 2);
    }
  }
}

function getStageColor(stage) {
  if (stage === "dirt") return color(139, 69, 19);
  if (stage === "sprout") return color(144, 238, 144);
  if (stage === "bloom") return color(34, 139, 34);
  return color(200);
}

function mousePressed() {
  if (gameOver || tapsLeft <= 0) return;

  const col = floor((mouseX - xOffset) / cellSize);
  const row = floor((mouseY - yOffset) / cellSize);
  if (col >= 0 && col < columns && row >= 0 && row < rows) {
    const progressed = growCell(row, col);
    if (progressed) {
      tapsLeft--;
      if (tapsLeft <= 0) setTimeout(nextLevel, 1000);
    }
    if (showInstructions) showInstructions = false;
  }
}

function growCell(row, col) {
  const cell = board[row][col];
  if (!cell || cell.stage === "bloom") return false;

  if (cell.stage === "dirt") {
    cell.stage = "sprout";
    score++;
    addBloomEffect(row, col);
    return true;
  }

  if (cell.stage === "sprout") {
    cell.stage = "bloom";
    score++;
    addBloomEffect(row, col);
    bloom(row, col);
    return true;
  }

  return false;
}

function progressCell(row, col) {
  const cell = board[row][col];
  if (cell?.stage === "sprout") {
    cell.stage = "bloom";
    score++;
    addBloomEffect(row, col);
    bloom(row, col);
  }
}

function bloom(row, col) {
  const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const orthogonal = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  // Diagonals: chain sprouts into bloom.
  for (const [dr, dc] of diagonals) {
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < rows && c >= 0 && c < columns && board[r][c].stage === "sprout") {
      addVineEffect(row, col, r, c);
      setTimeout(() => progressCell(r, c), 150);
    }
  }

  // Orthogonal: transform dirt into sprout.
  for (const [dr, dc] of orthogonal) {
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < rows && c >= 0 && c < columns && board[r][c].stage === "dirt") {
      board[r][c].stage = "sprout";
      addBloomEffect(r, c);
    }
  }
}

function addBloomEffect(row, col) {
  const x = col * cellSize + cellSize / 2 + xOffset;
  const y = row * cellSize + cellSize / 2 + yOffset;
  bloomEffects.push({ x, y, timer: 30 });
}

function drawBloomEffects() {
  for (let i = bloomEffects.length - 1; i >= 0; i--) {
    const b = bloomEffects[i];
    const progress = (30 - b.timer) / 30;
    noFill();
    stroke(255, 255 * (1 - progress));
    strokeWeight(2);
    ellipse(b.x, b.y, cellSize * progress * 1.5);
    if (--b.timer <= 0) bloomEffects.splice(i, 1);
  }
}

function addVineEffect(sr, sc, tr, tc) {
  vineEffects.push({
    sx: sc * cellSize + cellSize / 2 + xOffset,
    sy: sr * cellSize + cellSize / 2 + yOffset,
    tx: tc * cellSize + cellSize / 2 + xOffset,
    ty: tr * cellSize + cellSize / 2 + yOffset,
    progress: 0
  });
}

function drawVineEffects() {
  for (let i = vineEffects.length - 1; i >= 0; i--) {
    const v = vineEffects[i];
    stroke(34, 139, 34);
    strokeWeight(3);
    const t = v.progress;
    const x = lerp(v.sx, v.tx, t);
    const y = lerp(v.sy, v.ty, t);
    line(v.sx, v.sy, x, y);
    v.progress += 0.08;
    if (v.progress >= 1) vineEffects.splice(i, 1);
  }
}

function nextLevel() {
  if (level >= 3) {
    gameOver = true;
    setTimeout(() => submitScore(username, score, deviceBlueprint), 500);
    return;
  }
  level++;
  tapsLeft = level === 2 ? 13 : 15;
  initializeBoard();
}

function drawGameOver() {
  fill(0, 150);
  rect(0, 0, width, height);
  fill(255);
  textSize(48);
  textAlign(CENTER, CENTER);
  text(`Game Over, ${username}`, width / 2, height / 2 - 60);
  textSize(32);
  text(`Final Score: ${score}`, width / 2, height / 2 - 20);
  text(`Highscore: ${Math.max(score, highscore)}`, width / 2, height / 2 + 20);
}

function resetGame() {
  score = 0;
  level = 1;
  tapsLeft = 11;
  gameOver = false;
  initializeBoard();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateCellSize();
}

function touchStarted() {
  mousePressed();
  return false;
}

function touchEnded() {
  return false;
}

async function submitScore(username, score, deviceBlueprint) {
  const data = { username, highScore: score, deviceBlueprint };
  try {
    const response = await fetch("/api/submit-score", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (typeof fetchLeaderboard === 'function') {
      fetchLeaderboard(1, 5, 'leaderboard-list');
    }
    return result;
  } catch (err) {
    console.error("Error submitting score:", err);
    return null;
  }
}
