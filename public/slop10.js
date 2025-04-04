// --- Classes --- //
class Player {
  constructor() {
    this.money = 1000;
    this.bitcoins = 0;
    this.totalHashRate = 0;
    this.totalMined = 0;
  }
}

class Miner {
  constructor(name, cost, hashRate, displayColor) {
    this.name = name;
    this.cost = cost;
    this.hashRate = hashRate;
    this.displayColor = displayColor;
  }
}

// --- Global Variables --- //
const maxHistory = 50;
let player, btcPrice = 1.0, blockReward = 20, difficulty = 1000;
let inGameDays = 0, totalSeconds = 0, gameWon = false;
let username = "";
let deviceBlueprint = "";
let highscore = 0;
const updateInterval = 1000, secondsPerInGameDay = 108;
let lastUpdateTime = 0, rawPriceHistoryComplete = [];
let miners = [], ownedMiners = [], logs = [], minerColors = [];
let nextHalvingThreshold = 1000;

// Miner grid layout variables (modified to move the grid up)
let minerGridStartX = 10;
let minerGridStartY = 260;  // Moved up from 350
let minerGridSlotSize = 50;
let minerGridGap = 10;
let minerGridCols;

// Trade amount constant
const TRADE_AMOUNT = 10;
const MAX_MINERS = 18; // Maximum number of miners allowed

// --- p5.js Setup --- //
function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("game-container");
  canvas.style('touch-action', 'none');
  textFont('monospace');
  
  // Retrieve user data from localStorage
  let storedData = localStorage.getItem('SlopId');
  if (storedData) {
    let slopData = JSON.parse(storedData);
    username = slopData.slopTag || "";
    deviceBlueprint = slopData.deviceBlueprint || "";
  }
  
  // Define colors for miners
  minerColors = [
    color(135, 206, 235), color(144, 238, 144), color(255, 215, 0),
    color(186, 85, 211), color(255, 105, 180), color(124, 252, 0)
  ];
  
  // Fill raw price history with the initial price so graph starts full.
  for (let i = 0; i < maxHistory; i++) rawPriceHistoryComplete.push(btcPrice);
  
  player = new Player();
  miners.push(new Miner("CPU 1", 200, 25, minerColors[0]));    // was 500, now 250
  miners.push(new Miner("CPU 2", 500, 75, minerColors[1]));     // was 1500, now 750
  miners.push(new Miner("GPU 1", 1500, 400, minerColors[2]));   
  miners.push(new Miner("ASIC 1", 5000, 2500, minerColors[3]));  
  miners.push(new Miner("ASIC 2", 15000, 10000, minerColors[4])); 
  miners.push(new Miner("Quantum", 50000, 50000, minerColors[5])); 
  
  lastUpdateTime = millis();
  minerGridCols = floor((width - 20) / (minerGridSlotSize + minerGridGap));
  
  // Prevent default scrolling on touch devices
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  minerGridCols = floor((width - 20) / (minerGridSlotSize + minerGridGap));
}

// --- p5.js Draw Loop --- //
function draw() {
  background(40);
  fill(255);
  textSize(20);
  
  // Title centered at the top.
  textAlign(CENTER);
  text("Bitcoin Miner", width / 2, 30);
  textAlign(LEFT);
  
  if (gameWon) {
    drawWinScreen();
    return;
  }
  
  // Display player stats.
  let margin = 10;
  // Left column: Money and BTC held.
  text(`$${player.money.toFixed(0)}`, margin, 60);
  text(`${player.bitcoins.toFixed(2)} BTC`, margin, 85);
  
  // Right column: Hash rate and below that the exchange rate.
  let rightX = margin + width * 0.5;
  text(`Hash: ${player.totalHashRate} H/s`, rightX, 60);
  text(`Price: $${btcPrice.toFixed(2)}`, rightX, 85);
  
  // Draw the full-width graph at the top.
  drawPriceGraph();
  
  // Draw trade buttons side by side under the graph.
  drawTradeButtons();
  
  // Draw shop (for buying miners).
  drawShop();
  
  // Draw the owned miners grid.
  drawOwnedMiners();
  
  // Draw recent logs.
  drawLogs();
  
  // Update game logic using the old dt logic.
  let curTime = millis();
  if (curTime - lastUpdateTime >= updateInterval) {
    let dt = (curTime - lastUpdateTime) / 1000;
    totalSeconds += dt;
    lastUpdateTime = curTime;
    
    autoMine(dt);
    updateBTCPrice(dt);
    updateDifficulty(dt);
    rawPriceHistoryComplete.push(btcPrice);
    if (rawPriceHistoryComplete.length > maxHistory) rawPriceHistoryComplete.shift();
    checkHalving();
  }
}

// --- Price Graph --- //
function drawPriceGraph() {
  // Graph spans the full width.
  let graphX = 0;
  let graphY = 100;
  let graphW = width;
  let graphH = 100;
  fill(60);
  rect(graphX, graphY, graphW, graphH);
  
  let data = rawPriceHistoryComplete.slice(-maxHistory);
  if (data.length < 2) return;
  
  let minPrice = Math.min(...data), maxPrice = Math.max(...data);
  if (minPrice === maxPrice) { minPrice *= 0.9; maxPrice *= 1.1; }
  
  stroke(0, 255, 0);
  noFill();
  beginShape();
  for (let i = 0; i < data.length; i++) {
    let x = map(i, 0, data.length - 1, graphX, graphX + graphW);
    let y = map(data[i], minPrice, maxPrice, graphY + graphH, graphY);
    vertex(x, y);
  }
  endShape();
}

function getTradeAmount() {
  if (player.bitcoins < 10) {
    return 1;
  } else {
    return 100 * Math.pow(10, Math.floor(Math.log10(player.bitcoins)) - 2);
  }
}

// --- Trade Buttons --- //
function drawTradeButtons() {
  // Place buttons under the graph.
  let btnWidth = (width - 30) / 2; // leave 10px margins and 10px between buttons
  let btnHeight = 40;
  let tradeY = 100 + 100 + 10; // graphY + graphH + margin
  let buyX = 10;
  let sellX = buyX + btnWidth + 10;
  
  let tradeAmount = getTradeAmount();
  
  noStroke();
  // Buy Button.
  fill(player.money >= (tradeAmount * btcPrice) ? color(80) : color(50));
  rect(buyX, tradeY, btnWidth, btnHeight, 5);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(14);
  text(`Buy ${tradeAmount} BTC`, buyX + btnWidth / 2, tradeY + btnHeight / 2);
  
  // Sell Button.
  fill(player.bitcoins >= TRADE_AMOUNT ? color(80) : color(50));
  rect(sellX, tradeY, btnWidth, btnHeight, 5);
  fill(255);
  text(`Sell ${tradeAmount} BTC`, sellX + btnWidth / 2, tradeY + btnHeight / 2);
}

// --- Shop with Buttons --- //
function drawShop() {
  // Shop list starting near the bottom.
  let startY = height - 180;
  for (let i = 0; i < miners.length; i++) {
    let x = 10, y = startY + i * 30;
    fill(miners[i].displayColor);
    rect(x, y - 20, 20, 20);
    fill(255);
    textSize(14);
    textAlign(LEFT, CENTER);
    text(`${miners[i].name} - $${miners[i].cost}`, x + 25, y - 10);
    
    noStroke();
    // Subtle "Buy" button for each miner.
    fill(player.money >= miners[i].cost ? color(80) : color(50));
    rect(width - 70, y - 25, 60, 25, 5);
    fill(255);
    textAlign(CENTER, CENTER);
    text("Buy", width - 70 + 30, y - 25 + 12.5);
  }
}

// --- Owned Miners Grid --- //
function drawOwnedMiners() {
  for (let i = 0; i < ownedMiners.length; i++) {
    let col = i % minerGridCols;
    let row = floor(i / minerGridCols);
    let x = minerGridStartX + col * (minerGridSlotSize + minerGridGap);
    let y = minerGridStartY + row * (minerGridSlotSize + minerGridGap);
    fill(ownedMiners[i].displayColor);
    rect(x, y, minerGridSlotSize, minerGridSlotSize);
  }
}

// --- Logs --- //
function drawLogs() {
  let logY = height - 220;
  textSize(16);
  fill(220);
  for (let i = max(0, logs.length - 2); i < logs.length; i++) {
    text(logs[i], width/2, logY);
    logY += 15;
  }
  if (logs.length > 10) logs.shift();
}

// --- Game Logic --- //
function autoMine(dt) {
  let btcEarned = (player.totalHashRate / difficulty) * blockReward * dt;
  player.bitcoins += btcEarned;
  player.totalMined += btcEarned;
  if (btcEarned > 0.001) logs.push(`Mined ${btcEarned.toFixed(4)} BTC`);
}

let mu = 0.2;
let sigma = 0.5;

function updateBTCPrice(dt) {
  let dW = randomGaussian() * sqrt(dt);
  btcPrice = btcPrice * exp((mu - (0.5 * sigma * sigma)) * dt + sigma * dW);
  btcPrice = max(btcPrice, 0.001);
}

function updateDifficulty(dt) {
  difficulty *= 1 + (0.001 * dt);
}

function checkHalving() {
  if (player.totalMined >= nextHalvingThreshold) {
    blockReward /= 2;
    btcPrice /= 3;
    logs.push(`Halving! Reward: ${blockReward}`);
    mu += .005;
    sigma += .001;
    nextHalvingThreshold += 250;
  }
  if (player.totalMined >= 1000) gameWon = true;
}

function buyMiner(index) {
  if (index >= 0 && index < miners.length) {
    let miner = miners[index];
    if (ownedMiners.length >= MAX_MINERS) {
      logs.push(`Maximum of ${MAX_MINERS} miners reached!`);
      return;
    }
    if (player.money >= miner.cost) {
      player.money -= miner.cost;
      player.totalHashRate += miner.hashRate;
      logs.push(`Bought ${miner.name} for $${miner.cost}`);
      ownedMiners.push(miner);
      difficulty *= 1.05;
    } else {
      logs.push(`Not enough money for ${miner.name}`);
    }
  }
}

function mousePressed() {
  // If the game is won, check if either button is clicked
  if (gameWon) {
    // Check if restart button is clicked
    if (mouseX > width / 2 - 180 && mouseX < width / 2 - 20 &&
        mouseY > height / 2 + 55 && mouseY < height / 2 + 105) {
      // Update highscore if needed
      if (player.money > highscore) {
        highscore = player.money;
      }
      // Reset the game
      resetGame();
      return;
    }
    
    // Check if leaderboard button is clicked
    if (mouseX > width / 2 + 20 && mouseX < width / 2 + 180 &&
        mouseY > height / 2 + 55 && mouseY < height / 2 + 105) {
      // Update highscore if needed
      if (player.money > highscore) {
        highscore = player.money;
      }
      
      // Submit the score asynchronously
      submitScore(username, highscore, deviceBlueprint);

      // Toggle visibility of game and not-game containers
      document.getElementById('game-container').style.display = 'none';
      document.getElementById('not-game-container').style.display = 'block';
      
      // Add event listener to the play button to show the game again
      document.getElementById('play-button').addEventListener('click', function() {
        document.getElementById('not-game-container').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        // Reset the game
        resetGame();
      });

      document.getElementById('play-button').addEventListener('touchend', function() {
        document.getElementById('not-game-container').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        // Reset the game
        resetGame();
      });

      const homeButton = document.getElementById('home-button');
      homeButton.addEventListener('click', navigateHome);
      homeButton.addEventListener('touchend', navigateHome);
      
      return;
    }
    
    // If neither button was clicked, do nothing
    return;
  }
  
  // Handle game interactions
  // First, check trade buttons.
  let btnWidth = (width - 30) / 2;
  let btnHeight = 40;
  let tradeY = 100 + 100 + 10; // graphY + graphH + margin
  let buyX = 10;
  let sellX = buyX + btnWidth + 10;
  
  if (mouseX >= buyX && mouseX <= buyX + btnWidth && mouseY >= tradeY && mouseY <= tradeY + btnHeight) {
    handleBuyBTC();
    return;
  }
  if (mouseX >= sellX && mouseX <= sellX + btnWidth && mouseY >= tradeY && mouseY <= tradeY + btnHeight) {
    handleSellBTC();
    return;
  }
  
  // Next, check if a shop button was clicked.
  let startY = height - 180;
  for (let i = 0; i < miners.length; i++) {
    let y = startY + i * 30;
    if (mouseX > width - 70 && mouseX < width - 10 && mouseY > y - 25 && mouseY < y) {
      buyMiner(i);
      return;
    }
  }
  
  // Finally, check if an owned miner was clicked to sell it.
  for (let i = 0; i < ownedMiners.length; i++) {
    let col = i % minerGridCols;
    let row = floor(i / minerGridCols);
    let mx = minerGridStartX + col * (minerGridSlotSize + minerGridGap);
    let my = minerGridStartY + row * (minerGridSlotSize + minerGridGap);
    if (mouseX > mx && mouseX < mx + minerGridSlotSize && mouseY > my && mouseY < my + minerGridSlotSize) {
      let minerSold = ownedMiners.splice(i, 1)[0];
      player.money += minerSold.cost * 0.75;
      player.totalHashRate -= minerSold.hashRate;
      logs.push(`Sold ${minerSold.name} for $${(minerSold.cost * 0.75).toFixed(0)}`);
      return;
    }
  }
}

function navigateHome(e) {
  e.preventDefault(); // Prevent any default behavior
  window.location.href = '/';
}

function resetGame() {
  player = new Player();
  btcPrice = 1.0;
  blockReward = 20;
  difficulty = 1000;
  inGameDays = 0;
  totalSeconds = 0;
  gameWon = false;
  ownedMiners = [];
  logs = [];
  rawPriceHistoryComplete = [];
  for (let i = 0; i < maxHistory; i++) rawPriceHistoryComplete.push(btcPrice);
  nextHalvingThreshold = 1000;
  mu = 0.2;
  sigma = 0.5;
}

// --- Touch Interaction (for mobile) --- //
function touchStarted() {
  return false;
}

function touchEnded() {
  // Use first touch coordinates if available.
  let tx = touches.length > 0 ? touches[0].x : mouseX;
  let ty = touches.length > 0 ? touches[0].y : mouseY;
  
  // If the game is won, check if either button is clicked
  if (gameWon) {
    // Check if restart button is clicked
    if (tx > width / 2 - 180 && tx < width / 2 - 20 &&
        ty > height / 2 + 55 && ty < height / 2 + 105) {
      // Update highscore if needed
      if (player.money > highscore) {
        highscore = player.money;
      }
      // Reset the game
      resetGame();
      return false;
    }
    
    // Check if leaderboard button is clicked
    if (tx > width / 2 + 20 && tx < width / 2 + 180 &&
        ty > height / 2 + 55 && ty < height / 2 + 105) {
      // Update highscore if needed
      if (player.money > highscore) {
        highscore = player.money;
      }
      
      // Submit the score asynchronously
      submitScore(username, highscore, deviceBlueprint);

      // Toggle visibility of game and not-game containers
      document.getElementById('game-container').style.display = 'none';
      document.getElementById('not-game-container').style.display = 'block';
      
      // Add event listener to the play button to show the game again
      document.getElementById('play-button').addEventListener('click', function() {
        document.getElementById('not-game-container').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        // Reset the game
        resetGame();
      });

      document.getElementById('play-button').addEventListener('touchend', function() {
        document.getElementById('not-game-container').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        // Reset the game
        resetGame();
      });

      const homeButton = document.getElementById('home-button');
      homeButton.addEventListener('click', navigateHome);
      homeButton.addEventListener('touchend', navigateHome);
      
      return false;
    }
    
    // If neither button was clicked, do nothing
    return false;
  }
  
  // First, check trade buttons.
  let btnWidth = (width - 30) / 2;
  let btnHeight = 40;
  let tradeY = 100 + 100 + 10; // graphY + graphH + margin
  let buyX = 10;
  let sellX = buyX + btnWidth + 10;
  
  if (tx >= buyX && tx <= buyX + btnWidth && ty >= tradeY && ty <= tradeY + btnHeight) {
    handleBuyBTC();
    return false;
  }
  if (tx >= sellX && tx <= sellX + btnWidth && ty >= tradeY && ty <= tradeY + btnHeight) {
    handleSellBTC();
    return false;
  }
  
  // Next, check if a shop button was tapped.
  let startY = height - 180;
  for (let i = 0; i < miners.length; i++) {
    let y = startY + i * 30;
    if (tx > width - 70 && tx < width - 10 && ty > y - 25 && ty < y) {
      buyMiner(i);
      return false;
    }
  }
  
  // Finally, check if an owned miner was tapped to sell it.
  for (let i = 0; i < ownedMiners.length; i++) {
    let col = i % minerGridCols;
    let row = floor(i / minerGridCols);
    let mx = minerGridStartX + col * (minerGridSlotSize + minerGridGap);
    let my = minerGridStartY + row * (minerGridSlotSize + minerGridGap);
    if (tx > mx && tx < mx + minerGridSlotSize && ty > my && ty < my + minerGridSlotSize) {
      let minerSold = ownedMiners.splice(i, 1)[0];
      player.money += minerSold.cost * 0.75;
      player.totalHashRate -= minerSold.hashRate;
      logs.push(`Sold ${minerSold.name} for $${(minerSold.cost * 0.75).toFixed(0)}`);
      return false;
    }
  }
  return false;
}

// --- Trading Functions --- //
function handleBuyBTC() {
  let amount = getTradeAmount();
  let cost = amount * btcPrice;
  if (player.money >= cost) {
    player.money -= cost;
    player.bitcoins += amount;
    logs.push(`Bought ${amount} BTC`);
  }
}

function handleSellBTC() {
  let amount = getTradeAmount();
  if (player.bitcoins >= amount) {
    player.bitcoins -= amount;
    player.money += amount * btcPrice;
    logs.push(`Sold ${amount} BTC`);
  }
}

// --- Win Screen --- //
function drawWinScreen() {
  fill(0, 200);
  rect(0, 0, width, height);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  text(`You Won, ${username}!`, width / 2, height / 2 - 60);
  textSize(32);
  text(`$${player.money.toFixed(0)} | ${player.bitcoins.toFixed(2)} BTC`, width / 2, height / 2 - 20);
  
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

// Async function to submit score to the backend
async function submitScore(username, score, deviceBlueprint) {
  // Prepare the data to send to the backend
  const data = { 
    username, 
    highScore: score, 
    deviceBlueprint,
    gameId: 10  // Specify gameId as 10 for slop10
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
    
    // Fetch updated leaderboard after submitting score
    if (typeof fetchLeaderboard === 'function') {
      fetchLeaderboard(10, 5, 'leaderboard-list');
    }
    
    return responseData;
  } catch (error) {
    console.error("Error submitting score:", error);
    return null;
  }
}
