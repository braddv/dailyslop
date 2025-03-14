export default async function handler(req, res) {
    // Set CORS headers to allow browser requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Log request details for debugging
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    
    if (req.method === 'POST') {
      try {
        // Extract data from request body
        let username, highScore, deviceBlueprint;
        
        // Handle different content types
        const contentType = req.headers['content-type'] || '';
        
        if (contentType.includes('application/json')) {
          // JSON data
          ({ username, highScore, deviceBlueprint } = req.body);
        } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
          // Form data
          username = req.body.username;
          highScore = parseInt(req.body.highScore);
          deviceBlueprint = req.body.deviceBlueprint;
        } else {
          // Unknown content type
          return res.status(415).json({ 
            error: 'Unsupported Media Type',
            message: `Content-Type ${contentType} not supported`
          });
        }
        
        // Validate data
        if (!username || isNaN(highScore) || !deviceBlueprint) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Missing or invalid required fields',
            received: { username, highScore, deviceBlueprint }
          });
        }
        
        // Process the data (this is where you'd save to a database, etc.)
        console.log('Processing score submission:', { username, highScore, deviceBlueprint });
        
        // Return success response
        return res.status(200).json({
          success: true,
          message: 'Score submitted successfully',
          data: { username, highScore, deviceBlueprint }
        });
      } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: error.message
        });
      }
    }
    
    // Handle GET requests (for testing)
    if (req.method === 'GET') {
      return res.status(200).json({
        message: 'Score submission API is working. Use POST to submit scores.'
      });
    }
    
    // If we get here, method is not supported
    return res.status(405).json({ error: 'Method Not Allowed' });
  }