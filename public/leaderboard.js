// Function to fetch leaderboard data from the API
async function fetchLeaderboard(gameId = 1, limit = 5, elementId = 'leaderboard-list') {
  try {
    const response = await fetch(`/api/get-leaderboard?gameId=${gameId}&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    
    if (data.success && data.leaderboard) {
      updateLeaderboardDisplay(data.leaderboard, elementId);
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    updateLeaderboardDisplay([], elementId);
  }
}

// Function to update the leaderboard display
function updateLeaderboardDisplay(leaderboardData, elementId = 'leaderboard-list') {
  const leaderboardList = document.getElementById(elementId);
  if (!leaderboardList) return;
  
  // Clear existing entries
  leaderboardList.innerHTML = '';
  
  if (leaderboardData && Array.isArray(leaderboardData) && leaderboardData.length > 0) {
    // Add new entries from the API response
    leaderboardData.forEach(entry => {
      const listItem = document.createElement('li');
      listItem.textContent = `- ${entry.username} - ${entry.score}`;
      leaderboardList.appendChild(listItem);
    });
  } else {
    // If no entries were received, show a message
    const listItem = document.createElement('li');
    listItem.textContent = '- No scores yet -';
    leaderboardList.appendChild(listItem);
  }
}
