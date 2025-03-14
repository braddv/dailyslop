export default function handler(req, res) {
    // Set basic headers
    res.setHeader('Content-Type', 'application/json');
    
    // Return a simple response
    res.status(200).json({ hello: 'world' });
  }