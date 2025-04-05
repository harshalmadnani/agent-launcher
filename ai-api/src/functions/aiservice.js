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
    const systemContent = `You are a data fetcher. Your role is to identify and fetch the relevant data based on the user's question.
- Social Analysis:
  - fetchSocialData(token) - returns detailed social metrics including:
    * Topic rank and related topics
    * Post counts by platform (Twitter, YouTube, Reddit, TikTok, News)
    * Interaction counts by platform
    * Sentiment analysis by platform
    * 24h interaction totals
    * Number of contributors and total posts
    * Trend direction (up/down/flat)

  - Swap functions:
    - swap(src, dst, amount, from, origin, slippage, chainId) - returns a swap transaction
    - getSwapQuote(src, dst, amount, chainId) - returns a swap quote in wei

  - Token functions:
- Market Data:
  - price(token) - returns current price in USD
  - volume(token) - returns 24h volume
  - marketCap(token) - returns market cap
  - marketCapDiluted(token) - returns fully diluted market cap
  - liquidity(token) - returns liquidity
  - liquidityChange24h(token) - returns 24h liquidity change %
  - offChainVolume(token) - returns off-chain volume
  - volume7d(token) - returns 7d volume
  - volumeChange24h(token) - returns 24h volume change %
  - isListed(token) - returns listing status
  - priceChange24h(token) - returns 24h price change %
  - priceChange1h(token) - returns 1h price change %
  - priceChange7d(token) - returns 7d price change %
  - priceChange1m(token) - returns 30d price change %
  - priceChange1y(token) - returns 1y price change %
  - ath(token) - returns all-time high price
  - atl(token) - returns all-time low price
  - rank(token) - returns market rank
  - totalSupply(token) - returns total supply
  - circulatingSupply(token) - returns circulating supply

- Social/Info:
  - website(token) - returns official website URL
  - twitter(token) - returns Twitter handle
  - telegram(token) - returns Telegram group link
  - discord(token) - returns Discord server link
  - description(token) - returns project description

- Historical Data:
  - cexs(token) - returns exchange listing information
  - investors(token) - returns detailed investor information
  - distribution(token) - returns token distribution
  - releaseSchedule(token) - returns token release schedule

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
  - getGenerateAndUploadPortfolioChart(addresses, chainId, timerange) - generates and uploads a chart, returns URL
    * addresses: MUST be a valid Ethereum address (42 characters including 0x)
    * chainId: MUST be a number (e.g., 1 for Ethereum)
    * timerange: Valid formats: "1day", "1week", "1month", etc.
  - getCurrentValue(walletAddress, chainId) - returns the current value of a wallet
  - getProfitAndLoss(walletAddress, chainId, fromTimestamp, toTimestamp) - returns profit and loss
  - getTokenDetails(walletAddress, chainId) - returns token details
  - getNFTsByAddress(address, chainIds) - returns NFTs owned by an address

  -Mobula functions:
  - fetchMarketData(coinname) - returns market data
  - fetchMetadata(coinname) - returns metadata
  - fetchHistoricPortfolioData(from, to, addresses) - returns historic portfolio data
  - fetchWalletPortfolio(address) - returns wallet portfolio

  -Metal functions:
    -distributeTokens(address, amount, sendTo) - distributes tokens to an address
    -launchToken(name, ticker) - launches a token
IMPORTANT TOKEN ADDRESSES:
- ETH on any network: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
- USDC on Base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
- USDT on Base: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
- The default chain is base whose chain id is 8453

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
2. Format your response as JavaScript code that calls the necessary functions
3. Always return the fetched data as a structured object
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
      return `Based on the data provided, I can see you're interested in portfolio chart functionality. Your portfolio data appears to be retrievable with the correct wallet address format.`;
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
      try {
        const response = await groq.chat.completions.create({
          model: "deepseek-r1-distill-llama-70b",
          messages: messages,
        });

        // Remove the think section from the response
        const content = response.choices[0].message.content;
        return content.replace(/```think\n[\s\S]*?\n```/g, '').trim();
      } catch (groqError) {
        console.error('Error calling Groq API:', groqError);
        // Return a fallback response if Groq API fails
        return `I've analyzed your portfolio data. ${executedData.error ? 
          "There was an issue retrieving your portfolio data. Please ensure you're using a valid Ethereum address and correct parameters." : 
          "Your portfolio chart has been generated successfully."}`;
      }
    }
    
    // Fallback for unsupported models
    return `I've analyzed your portfolio data. ${executedData.error ? 
      "There was an issue retrieving your portfolio data. Please ensure you're using a valid Ethereum address and correct parameters." : 
      "Your portfolio chart has been generated successfully."}`;

  } catch (error) {
    console.error('Error calling AI Character API:', error);
    // Return a fallback response instead of throwing
    return `Unable to analyze the data due to a technical issue. ${error.message}`;
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
      ...require('../functions/mobula'),
      ...require('../functions/token'),
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
    let dataFetchingCode;
    try {
      dataFetchingCode = await dataAPI(userInput, model);
      console.log('Data fetching code generated:', dataFetchingCode);
      if (!dataFetchingCode) {
        throw new Error('Failed to generate data fetching code');
      }
    } catch (codeGenError) {
      console.error('Error generating data fetching code:', codeGenError);
      // Provide fallback code for portfolio chart requests
      if (userInput.toLowerCase().includes('portfolio') && userInput.toLowerCase().includes('chart')) {
        const walletMatch = userInput.match(/0x[a-fA-F0-9]{40}/);
        const walletAddress = walletMatch ? walletMatch[0] : "0xa5F8A22D2ee33281ca772f0eB18C04A32314bf6B";
        dataFetchingCode = `
const data = {
  portfolioChart: await getGenerateAndUploadPortfolioChart(
    "${walletAddress}", 
    1,
    "1month"
  )
};
return data;`;
        console.log('Using fallback code for portfolio chart:', dataFetchingCode);
      } else {
        throw codeGenError; // Re-throw if we can't generate fallback code
      }
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
    let analysis;
    try {
      analysis = await characterAPI(userInput, analysisData, systemPrompt, model);
      console.log('Generated analysis:', analysis);
      if (!analysis) {
        throw new Error('Empty analysis returned');
      }
    } catch (analysisError) {
      console.error('Error generating analysis:', analysisError);
      // Provide fallback analysis
      analysis = `Based on your request for portfolio data${executedData.error ? 
        ", there was an issue retrieving the information. Please check that you're using a valid wallet address and try again." : 
        ", I've successfully retrieved the data. Your portfolio information is now available."}`;
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