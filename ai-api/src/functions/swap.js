const axios = require("axios");

// Hardcoded API credentials
const ONE_INCH_API_KEY = "ab4VmoqAepOnY86Y47rB86AIvvYvCHP4";
const JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzQzODM2NzE0LCJqdGkiOiJmZGViZTIwYS0xZGVmLTRiYWEtODYyZS00MWJmZWZmZjcxM2YifQ.cpG1R5Uyzoy6bL2-ijwV8HQOKk12JW9X4fuRr07qc7Q";

// Generate a swap transaction using the 1inch API
const generateSwapTransaction = async (src, dst, amount, from, origin, slippage, chainId = 1) => {
  try {
    // Ensure chainId is provided and is a valid number
    if (!chainId) chainId = 1;
    
    const url = `https://api.1inch.dev/swap/v6.0/${chainId}/swap`;
    console.log(`Making swap request to: ${url}`);
    console.log(`Params: src=${src}, dst=${dst}, amount=${amount}, from=${from}, origin=${origin}, slippage=${slippage}`);
    
    const response = await axios.get(url, {
      headers: {
        "Authorization": `Bearer ${ONE_INCH_API_KEY}`
      },
      params: {
        "src": src,
        "dst": dst,
        "amount": amount,
        "from": from,
        "origin": origin,
        "slippage": slippage
      },
      paramsSerializer: {
        indexes: null
      }
    });
    
    // Return only the tx object
    return { tx: response.data.tx };
  } catch (error) {
    console.error(`Error generating swap transaction (chainId: ${chainId}):`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`API Response:`, error.response.data);
      console.error(`Request URL: ${error.config.url}`);
      console.error(`Request params: ${JSON.stringify(error.config.params)}`);
      console.error(`Request headers: ${JSON.stringify(error.config.headers)}`);
    } else {
      console.error('Network error or no response data available');
    }
    return null;
  }
};

// Get a swap quote from the 1inch API
const getSwapQuote = async (src, dst, amount, chainId = 1) => {
  try {
    // Ensure chainId is provided and is a valid number
    if (!chainId) chainId = 1;
    
    const url = `https://api.1inch.dev/swap/v6.0/${chainId}/quote`;
    console.log(`Making quote request to: ${url}`);
    console.log(`Params: src=${src}, dst=${dst}, amount=${amount}`);
    
    const response = await axios.get(url, {
      headers: {
        "Authorization": `Bearer ${ONE_INCH_API_KEY}`
      },
      params: {
        "src": src,
        "dst": dst,
        "amount": amount
      },
      paramsSerializer: {
        indexes: null
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error getting swap quote (chainId: ${chainId}):`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`API Response:`, error.response.data);
      console.error(`Request URL: ${error.config.url}`);
      console.error(`Request params: ${JSON.stringify(error.config.params)}`);
      console.error(`Request headers: ${JSON.stringify(error.config.headers)}`);
    } else {
      console.error('Network error or no response data available');
    }
    return null;
  }
};

// Sign and submit a swap transaction using the HSM API
const signbase = async (tx) => {
  try {
    const url = 'https://sfhqqxqwkfaslnwm5ktynkxgja.multibaas.com/api/v0/chains/ethereum/hsm/submit';
    console.log(`Making HSM submit request to: ${url}`);
    console.log(`Transaction data: ${JSON.stringify(tx).substring(0, 100)}...`);
    
    const response = await axios.post(url, 
      { tx },
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error signing swap transaction:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`API Response:`, error.response.data);
      console.error(`Request URL: ${error.config.url}`);
      console.error(`Request data: ${JSON.stringify(error.config.data).substring(0, 100)}...`);
      console.error(`Request headers: ${JSON.stringify(error.config.headers)}`);
    } else {
      console.error('Network error or no response data available');
    }
    throw error;
  }
};

// Combine generating a swap transaction and signing it
const swap = async (src, dst, amount, from, origin, slippage, chainId = 1) => {
  try {
    // Ensure chainId is provided
    if (!chainId) {
      console.log("No chainId provided, defaulting to 1 (Ethereum Mainnet)");
      chainId = 1;
    }
    
    console.log(`Starting swap process with chainId: ${chainId}`);
    console.log(`Swapping ${amount} of token ${src} to ${dst}`);
    
    // First generate the swap transaction
    const swapTransaction = await generateSwapTransaction(src, dst, amount, from, origin, slippage, chainId);
    
    if (!swapTransaction) {
      throw new Error('Failed to generate swap transaction');
    }
    
    // Then sign and submit the transaction
    const signedTransaction = await signbase(swapTransaction.tx);
    
    return signedTransaction;
  } catch (error) {
    console.error('Error in swap process:', error.message);
    throw error;
  }
};

module.exports = {
  generateSwapTransaction,
  getSwapQuote,
  signbase,
  swap
};
