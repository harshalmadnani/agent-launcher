const axios = require("axios");

// Generate a swap transaction using the 1inch API
const generateSwapTransaction = async (src, dst, amount, from, origin, slippage, apiKey) => {
  try {
    const url = "https://api.1inch.dev/swap/v6.0/1/swap";
    
    const response = await axios.get(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
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
    
    return response.data;
  } catch (error) {
    console.error('Error generating swap transaction:', error);
    return null;
  }
};

// Get a swap quote from the 1inch API
const getSwapQuote = async (src, dst, amount, apiKey) => {
  try {
    const url = "https://api.1inch.dev/swap/v6.0/1/quote";
    
    const response = await axios.get(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
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
    console.error('Error getting swap quote:', error);
    return null;
  }
};

module.exports = {
  generateSwapTransaction,
  getSwapQuote
};
