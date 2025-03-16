import { neon } from '@neondatabase/serverless';

const sql = neon(`${process.env.DATABASE_URL}`);

export default async function handler(req, res) {
  // Set CORS headers to allow browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    try {
      // Get game ID from query params, default to 1 (slop1)
      const gameId = parseInt(req.query.gameId) || 1;
      
      // Get limit from query params, default to 5
      const limit = parseInt(req.query.limit) || 5;
      
      // Query the database for top scores
      const leaderboardData = await sql`
        SELECT 
          tag || ' #' || SUBSTRING(hash, 1, 3) as username, 
          score
        FROM leaderboard
        WHERE gamenumber = ${gameId}
        ORDER BY score DESC
        LIMIT ${limit}
      `;
      
      // Return the leaderboard data
      return res.status(200).json({
        success: true,
        leaderboard: leaderboardData
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
  
  // If we get here, method is not supported
  return res.status(405).json({ error: 'Method Not Allowed' });
}
