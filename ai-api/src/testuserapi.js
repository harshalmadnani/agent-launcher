const express = require('express');
const cors = require('cors');
const { getOrCreateUserAddress } = require('./functions/user');

const app = express();
const port = 3005;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'User API Test Server is running!' });
});

app.get('/user', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username'
      });
    }

    console.log(`Processing request for username: ${username}`);
    const result = await getOrCreateUserAddress(username);
    console.log(`Result:`, result);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      username: username,
      address: result.address
    });
  } catch (error) {
    console.error('Error in /user endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.listen(port, () => {
  console.log(`Test server is running on port ${port}`);
  console.log(`Try: curl http://localhost:${port}/user?username=testuser`);
}); 