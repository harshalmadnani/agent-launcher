require('dotenv').config();
const express = require('express');
const { analyzeQuery } = require('./functions/aiservice');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'AI API is running!' });
});

app.post('/analyze', async (req, res) => {
  try {
    const { query, systemPrompt, model } = req.body;

    if (!query || !systemPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: query and systemPrompt are required'
      });
    }

    const result = await analyzeQuery(query, systemPrompt, model);
    res.json(result);
  } catch (error) {
    console.error('Error in /analyze endpoint:', error);
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
  console.log(`Server is running on port ${port}`);
});
