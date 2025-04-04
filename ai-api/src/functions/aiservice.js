const axios = require('axios');
const Groq = require('groq-sdk');

// Get API key from environment variable
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.REACT_APP_GROQ_API_KEY;

// Initialize Groq
const groq = new Groq({
    apiKey: GROQ_API_KEY
});

// Model configuration
const MODEL_CONFIG = {
  'deepseek-r1-distill-llama-70b': {
    type: 'groq',
    model: 'deepseek-r1-distill-llama-70b'
  }
};

// Dependencies

const portfolioAddresses = ["0x0000000000000000000000000000000000000000"]; // Default address


/**
 * AI function to generate data fetching code based on user input
 * @param {string} userInput - The user's question
 * @param {string} model - The AI model to use
 * @returns {Promise<string>} - Data fetching code
 */
const dataAPI = async (userInput, model = 'deepseek-r1-distill-llama-70b') => {
  try {
    const systemContent = `You are Xade AI's data fetcher. Your role is to identify and fetch the relevant data based on the user's question.
- Deploy Token:
  - launchToken(name, ticker, merchantAddress) - creates a new token with the given parameters (no need to add a merchant address if not given)

- Social Analysis:
  - fetchSocialData(token) - returns detailed social metrics including:
    * Topic rank and related topics
    * Post counts by platform (Twitter, YouTube, Reddit, TikTok, News)
    * Interaction counts by platform
    * Sentiment analysis by platform
    * 24h interaction totals
    * Number of contributors and total posts
    * Trend direction (up/down/flat)

- List and Category Data:
  - fetchCoinList(sort, filter, limit) - returns filtered list of coins with metrics
    * sort: Field to sort by (e.g., 'social_dominance', 'market_cap', 'galaxy_score')
    * filter: Category filter (e.g., 'meme', 'defi', '')
    * limit: Number of results to return (default: 20)
    * Returns detailed metrics including:
      - Price and volume data
      - Market cap and dominance
      - Social metrics and sentiment
      - Galaxy Score and AltRank
      - Categories and blockchains

- News and Social Data:
  - fetchTopicNews(topic) - returns latest news articles for a topic with:
    * Article title, URL, and image
    * Publication date and sentiment score
    * Creator information (name, followers)
    * Interaction metrics (24h and total)
  - fetchSocialData(token) - returns detailed social metrics



Example format:
\`\`\`javascript
const data = {
  currentPrice: await price("bitcoin"),
  priceHistory: await priceHistoryData("bitcoin", "30d"),
  socialMetrics: await getSocialData("bitcoin"),
  news: await getTopicNews("bitcoin"),
};
return data;
\`\`\`

Instructions:
1. Return only the raw data needed to answer the user's question
2. Do not perform any calculations or analysis
3. Format your response as JavaScript code that calls the necessary functions
4. For historical data, always specify the period needed
5. Always return the fetched data as a structured object
6. For questions about token performance, price movement, or trading decisions, always include:
   - Technical analysis (1d, 7d, and 30d periods)
   - Recent price changes
   - Market data (volume, liquidity, market cap)

When providing buy/sell ratings or analysis, incorporate the user's custom strategy and preferences
`;

    if (model === 'deepseek-r1-distill-llama-70b') {
      // Use Groq
      const response = await groq.chat.completions.create({
        model: "deepseek-r1-distill-llama-70b",
        messages: [
          { 
            role: "system",
            content: systemContent
          },
          { role: "user", content: userInput }
        ],
      });

      // Remove the think section from the response
      const content = response.choices[0].message.content;
      const codeMatch = content.match(/```javascript\n([\s\S]*?)\n```/);
      if (codeMatch) {
        return codeMatch[1].trim();
      }
      return content;
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }

  } catch (error) {
    console.error('Error calling AI API:', error);
    throw new Error(`Failed to get AI response: ${error.message}`);
  }
};

/**
 * AI function to analyze data and provide insights
 * @param {string} userInput - The user's question
 * @param {object} executedData - Data fetched from API calls
 * @param {string} systemPrompt - System prompt for AI character
 * @param {string} model - The AI model to use
 * @returns {Promise<string>} - Analysis and insights
 */
const characterAPI = async (userInput, executedData, systemPrompt, model = 'deepseek-r1-distill-llama-70b') => {
  try {
    if (!systemPrompt) {
      throw new Error('System prompt is required for character API');
    }

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `User Question: ${userInput}

Available Data:
${JSON.stringify(executedData, null, 2)}

Please analyze this data and provide insights that directly address the user's question.`
      }
    ];

    if (model === 'deepseek-r1-distill-llama-70b') {
      const response = await groq.chat.completions.create({
        model: "deepseek-r1-distill-llama-70b",
        messages: messages,
      });

      // Remove the think section from the response
      const content = response.choices[0].message.content;
      return content.replace(/```think\n[\s\S]*?\n```/g, '').trim();
    }

  } catch (error) {
    console.error('Error calling AI Character API:', error);
    throw new Error('Failed to analyze data');
  }
};

/**
 * Execute data fetching code
 * @param {string} code - The code to execute
 * @returns {Promise<object>} - Executed data or error
 */
const executeCode = async (code) => {
  try {
    // Clean and validate the code input
    if (!code || typeof code !== 'string') {
      throw new Error('Invalid code input');
    }

    const cleanCode = code
      .replace(/```javascript\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    if (!cleanCode) {
      throw new Error('Empty code after cleaning');
    }

    // Create a safe context with allowed functions
    const context = {
      ...require('../functions/metal'),
      ...require('../functions/lunarcrush'),
      // Utility functions
      console: {
        log: (...args) => console.log(...args),
        error: (...args) => console.error(...args)
      }
    };

    // Create and execute async function with better error handling
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction(...Object.keys(context), `
      try {
        // Ensure the code returns a value
        const result = await (async () => {
          ${cleanCode}
        })();
        
        // Handle undefined or null results
        if (result === undefined || result === null) {
          return { error: 'No data returned' };
        }
        
        return result;
      } catch (error) {
        console.error('Error in executed code:', error);
        return { error: error.message };
      }
    `);
    
    // Execute the function with the context
    const result = await fn(...Object.values(context));
    
    // Handle error results
    if (result && result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error executing code:', error);
    // Return a structured error response instead of throwing
    return {
      error: true,
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Main function to analyze a user query
 * @param {string} userInput - The user's question
 * @param {string} systemPrompt - System prompt for AI character
 * @param {string} model - The AI model to use
 * @returns {Promise<object>} - Analysis results
 */
const analyzeQuery = async (userInput, systemPrompt, model = 'deepseek-r1-distill-llama-70b') => {
  try {
    if (!systemPrompt) {
      throw new Error('System prompt is required');
    }

    // Step 1: Get data fetching code from AI
    console.log('Step 1: Generating data fetching code...');
    const dataFetchingCode = await dataAPI(userInput, model);
    console.log('Data fetching code generated:', dataFetchingCode);
    if (!dataFetchingCode) {
      throw new Error('Failed to generate data fetching code');
    }

    // Step 2: Execute the code to fetch actual data
    console.log('Step 2: Executing data fetching code...');
    let executedData;
    try {
      executedData = await executeCode(dataFetchingCode);
      console.log('Executed data:', executedData);
    } catch (execError) {
      console.error('Warning: Data execution failed:', execError);
      executedData = {
        error: true,
        message: execError.message,
        partialData: {}
      };
    }

    // Step 3: Analyze the data using the specified model
    console.log('Step 3: Generating analysis and insights...');
    const analysis = await characterAPI(userInput, executedData, systemPrompt, model);
    console.log('Generated analysis:', analysis);
    if (!analysis) {
      throw new Error('Failed to generate analysis');
    }

    return {
      success: true,
      data: {
        rawData: executedData,
        analysis: analysis,
        debugInfo: {
          generatedCode: dataFetchingCode,
          systemPrompt: systemPrompt,
          model: model,
          timestamp: new Date().toISOString()
        }
      }
    };

  } catch (error) {
    console.error('Error in analysis pipeline:', error);
    return {
      success: false,
      error: {
        message: error.message,
        timestamp: new Date().toISOString(),
        details: error.stack
      }
    };
  }
};

module.exports = {
  dataAPI,
  characterAPI,
  executeCode,
  analyzeQuery,
  MODEL_CONFIG,
  groq
}; 