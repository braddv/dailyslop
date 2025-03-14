// Import any required dependencies
// For example, if you want to use a database like MongoDB, you would import it here
// const { MongoClient } = require('mongodb');

// Make sure scores persist between function calls
let scores = [];

export default async function handler(req, res) {
  try {
    console.log('API request received:', req.method);
    console.log('Request headers:', req.headers);
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // For debugging - return a simple response for GET requests
    if (req.method === 'GET') {
      return res.status(200).json({ 
        message: 'Score submission API is working',
        leaderboard: scores
      });
    }

    if (req.method === 'POST') {
      console.log('POST request body:', req.body);
      
      // Get the data from the request body with defaults
      let username = 'Anonymous';
      let highScore = 0;
      let deviceBlueprint = '';
      
      // Try to extract data if available
      if (req.body) {
        username = req.body.username || username;
        highScore = req.body.highScore || highScore;
        deviceBlueprint = req.body.deviceBlueprint || deviceBlueprint;
      }

      // Create a score object
      const scoreEntry = {
        username,
        score: highScore,
        deviceBlueprint: deviceBlueprint || '',
        timestamp: new Date().toISOString()
      };

      // In a real application, you would save this to a database
      // For example, with MongoDB:
      /*
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      const db = client.db('your-database-name');
      const collection = db.collection('scores');
      await collection.insertOne(scoreEntry);
      await client.close();
      */

      // For this example, we'll just add it to our in-memory array
      scores.push(scoreEntry);
      
      // Sort scores by score value (descending)
      scores.sort((a, b) => b.score - a.score);
      
      // Keep only top 10 scores
      if (scores.length > 10) {
        scores = scores.slice(0, 10);
      }

      // Return success response with the updated leaderboard
      return res.status(200).json({ 
        success: true, 
        message: 'Score submitted successfully',
        leaderboard: scores
      });
    }
    
    // If we get here, it's an unsupported method
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Error in API handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
