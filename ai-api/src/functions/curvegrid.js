const axios = require("axios");

// Using the same JWT token from swap.js
const JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzQzODM2NzE0LCJqdGkiOiJmZGViZTIwYS0xZGVmLTRiYWEtODYyZS00MWJmZWZmZjcxM2YifQ.cpG1R5Uyzoy6bL2-ijwV8HQOKk12JW9X4fuRr07qc7Q";
const BASE_URL = "https://sfhqqxqwkfaslnwm5ktynkxgja.multibaas.com";

/**
 * Get transaction history for a specific address
 * @param {string} address - The address to get transaction history for
 * @param {Object} options - Optional parameters
 * @param {string} options.hash - Transaction hash to filter by
 * @param {number} options.nonce - Transaction nonce to filter by
 * @param {string} options.status - Transaction status to filter by (e.g., 'pending')
 * @param {number} options.limit - Maximum number of transactions to return (default: 10)
 * @param {number} options.offset - Number of transactions to skip (default: 0)
 * @returns {Promise<Object>} Transaction history data
 */
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
