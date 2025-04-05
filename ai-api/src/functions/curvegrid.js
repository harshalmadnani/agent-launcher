const axios = require("axios");

// Using the same JWT token from swap.js
const JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzQzODM2NzE0LCJqdGkiOiJmZGViZTIwYS0xZGVmLTRiYWEtODYyZS00MWJmZWZmZjcxM2YifQ.cpG1R5Uyzoy6bL2-ijwV8HQOKk12JW9X4fuRr07qc7Q";
const BASE_URL = "https://sfhqqxqwkfaslnwm5ktynkxgja.multibaas.com";

const getTransactionHistory = async (address, options = {}) => {
  try {
    const {
      hash,
      nonce,
      status,
      limit = 10,
      offset = 0
    } = options;

    const url = `${BASE_URL}/api/v0/chains/ethereum/txm/${address}`;
    console.log(`Getting transaction history from: ${url}`);

    const params = {
      limit,
      offset
    };

    // Add optional parameters if they exist
    if (hash) params.hash = hash;
    if (nonce !== undefined) params.nonce = nonce;
    if (status) params.status = status;

    const response = await axios.get(url, {
      params,
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error getting transaction history:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`API Response:`, error.response.data);
      console.error(`Request URL: ${error.config.url}`);
      console.error(`Request params: ${JSON.stringify(error.config.params)}`);
      console.error(`Request headers: ${JSON.stringify(error.config.headers)}`);
    } else {
      console.error('Network error or no response data available');
    }
    throw error;
  }
};

module.exports = {
  getTransactionHistory
};
