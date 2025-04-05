const axios = require('axios');
const Groq = require('groq-sdk');

// Get API key from environment variable
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.REACT_APP_GROQ_API_KEY;

// Initialize Groq oconst groq = new Groq({nly if API key is availab
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

- Portfolio Data:
  - getPortfolioValueChart(addresses, chainId, timerange, useCache) - returns a chart of the portfolio value over time
    * addresses: Array of wallet addresses or single address
    * chainId: (optional, default: 1) The chain ID (1 for Ethereum)
    * timerange: (optional, default: "1month") Time range format: 
      - Valid API formats: "1day", "1week", "1month", "1year", "3years"
      - Short formats: "1d", "7d", "30d", "1y", "3y" 
    * useCache: (optional, default: true) Whether to use cached data
  - safeGetPortfolioValueChart(addresses, chainId, timerange, useCache) - safer version that handles errors gracefully
    * Same parameters as getPortfolioValueChart but returns fallback data on error
  - generateAndUploadPortfolioChart(addresses, chainId, timerange, outputPath) - generates a chart and uploads it to Supabase
    * addresses: Array of wallet addresses or single address
    * chainId: (optional, default: 1) The chain ID (1 for Ethereum)
    * timerange: (optional, default: "1day") Time range format
    * outputPath: (optional) Path to save the chart locally before uploading
    * Returns the public URL of the uploaded chart image
  - getNFTsByAddress(address, chainIds) - returns a list of NFTs owned by an address
  - getCurrentValue(walletAddress, chainId) - returns the current value of a wallet
  - getProfitAndLoss(walletAddress, chainId, fromTimestamp, toTimestamp) - returns the profit and loss of a wallet
  - getTokenDetails(walletAddress, chainId) - returns the details of a token    
  - getAddressFromUsername(username) - returns the address of a twitter username
- Swap Functions:
  - getSwapQuote(src, dst, amount, chainId) - gets a quote for swapping tokens
    * src: Source token address (for ETH use: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')
    * dst: Destination token address
    * amount: Amount to swap in wei
    * chainId: (optional, default: 1) The chain ID (e.g., 1 for Ethereum, 8453 for Base)
    * Returns detailed quote information
  - swap(src, dst, amount, from, origin, slippage, chainId) - generates and signs a swap transaction
    * Parameters same as generateSwapTransaction
    * Returns signed transaction

IMPORTANT TOKEN ADDRESSES:
- ETH on any network: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
- USDC on Base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
- USDT on Base: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'

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

For portfolio data example:
\`\`\`javascript
const data = {
  currentValue: await getCurrentValue("0x7E3bBf75aba09833f899bB1FDd917FC3A5617555", 1),
  // Use the safer function that handles errors gracefully with proper timerange
  portfolioChart: await safeGetPortfolioValueChart(
    ["0x7E3bBf75aba09833f899bB1FDd917FC3A5617555"], 
    1,           // chainId
    "1month"     // correct timerange format
  ),
};
return data;
\`\`\`

For swap example:
\`\`\`javascript
const data = {
 await swap(
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH on any chain
    1000000, // 1 USDC (assuming 6 decimals)
    "0xa5F8A22D2ee33281ca772f0eB18C04A32314bf6B", // From address
    "0xa5F8A22D2ee33281ca772f0eB18C04A32314bf6B", // Origin (same as from)
    0.5, // 0.5% slippage
    8453 // Base chain ID
  )
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

    // If no Groq API key is available, return a default response
    if (!GROQ_API_KEY) {
      console.log('No GROQ API key available, returning default analysis');
      return `Based on the data provided, I can see you're interested in swap functionality. The swap operation between tokens appears feasible with the given parameters.`;
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
      ...require('../functions/1inch'),
      // Add swap functions
      ...require('../functions/swap'),
      // Utility functions
      console: {
        log: (...args) => console.log(...args),
        error: (...args) => console.error(...args)
      }
    };

    // Capture logs for debugging
    const logs = [];
    const captureLog = {
      log: (...args) => {
        console.log(...args);
        logs.push({ type: 'log', content: args.map(arg => String(arg)).join(' ') });
      },
      error: (...args) => {
        console.error(...args);
        logs.push({ type: 'error', content: args.map(arg => String(arg)).join(' ') });
      }
    };

    const contextWithLogCapture = {
      ...context,
      console: captureLog
    };

    // Create and execute async function with better error handling
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction(...Object.keys(contextWithLogCapture), `
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
        
        // Extract important details from API errors
        if (error.name === 'AxiosError' && error.response) {
          return { 
            error: true, 
            message: \`API Error: \${error.response.status} - \${error.response.statusText}\`, 
            details: error.response.data,
            timestamp: new Date().toISOString()
          };
        }
        
        return { error: true, message: error.message };
      }
    `);
    
    // Execute the function with the context
    const result = await fn(...Object.values(contextWithLogCapture));
    
    // Add logs to the result
    const resultWithLogs = {
      ...(typeof result === 'object' ? result : { data: result }),
      _executionLogs: logs
    };
    
    // Handle error results
    if (result && result.error) {
      console.warn('Warning: Execution returned error object:', result.message);
      // Continue with partial data if available
      return {
        error: true,
        message: result.message,
        partialData: result.partialData || {},
        details: result.details || {},
        timestamp: new Date().toISOString(),
        _executionLogs: logs
      };
    }
    
    return resultWithLogs;
  } catch (error) {
    console.error('Error executing code:', error);
    // Return a structured error response instead of throwing
    return {
      error: true,
      message: error.message,
      timestamp: new Date().toISOString(),
      _executionLogs: [{ type: 'error', content: `Execution error: ${error.message}` }]
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
      console.error('Error executing data fetching code:', execError);
      executedData = {
        error: true,
        message: execError.message,
        partialData: {},
        timestamp: new Date().toISOString(),
        _executionLogs: [{ type: 'error', content: `Execution error: ${execError.message}` }]
      };
    }

    // Extract execution logs
    const executionLogs = executedData._executionLogs || [];
    // Remove logs from the data passed to AI to avoid confusion
    if (executedData._executionLogs) {
      delete executedData._executionLogs;
    }

    // Even if there are errors, still proceed with any partial data
    let analysisData = executedData;
    
    // If we got an error but have partial data, use that
    if (executedData.error && executedData.partialData) {
      console.log('Using partial data for analysis despite errors');
      analysisData = {
        ...executedData.partialData,
        errorInfo: {
          message: executedData.message,
          timestamp: executedData.timestamp
        }
      };
    }

    // Step 3: Analyze the data using the specified model
    console.log('Step 3: Generating analysis and insights...');
    const analysis = await characterAPI(userInput, analysisData, systemPrompt, model);
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
          timestamp: new Date().toISOString(),
          executionLogs: executionLogs
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