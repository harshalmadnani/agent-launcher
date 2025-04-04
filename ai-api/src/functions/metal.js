const METAL_API_BASE_URL = 'https://api.metal.build';
const METAL_API_KEY = process.env.METAL_API_KEY;
const METAL_SECRET_API_KEY = process.env.METAL_SECRET_API_KEY;

/**
 * Get comprehensive information about a token
 * @param {string} address - Address of the token
 * @returns {Promise<Object>} Token information including supply, holders, and metrics
 */
async function getToken(address) {
  const response = await fetch(`${METAL_API_BASE_URL}/token/${address}`, {
    headers: {
      'x-api-key': METAL_API_KEY,
    },
  });
  return response.json();
}

/**
 * Get or create a holder wallet for a user
 * @param {string} userId - External ID for the holder (e.g., customer ID)
 * @returns {Promise<Object>} Holder information including address and token balances
 */
async function getOrCreateHolder(userId) {
  const response = await fetch(`${METAL_API_BASE_URL}/holder/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': METAL_API_KEY,
    },
  });
  return response.json();
}

/**
 * Distribute tokens to a user
 * @param {string} tokenAddress - Address of the token to distribute
 * @param {string} sendTo - Recipient's wallet address
 * @param {number} amount - Amount of tokens to distribute
 * @returns {Promise<Object>} Distribution result
 */
async function distributeTokens(tokenAddress, sendTo, amount) {
  const response = await fetch(`${METAL_API_BASE_URL}/token/${tokenAddress}/distribute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': METAL_API_KEY,
    },
    body: JSON.stringify({
      sendTo,
      amount,
    }),
  });
  return response.json();
}

/**
 * Get token information with holder details
 * @param {string} address - Address of the token
 * @returns {Promise<Object>} Token information including holder details
 */
async function getTokenWithHolders(address) {
  const response = await fetch(`${METAL_API_BASE_URL}/token/${address}/holders`, {
    headers: {
      'x-api-key': METAL_API_KEY,
    },
  });
  return response.json();
}

/**
 * Get holder information
 * @param {string} userId - External ID of the holder
 * @returns {Promise<Object>} Holder information including balances and tokens
 */
async function getHolder(userId) {
  const response = await fetch(`${METAL_API_BASE_URL}/holder/${userId}`, {
    headers: {
      'x-api-key': METAL_API_KEY,
    },
  });
  return response.json();
}

/**
 * Withdraw tokens from a holder's wallet
 * @param {string} userId - External ID of the holder
 * @param {string} tokenAddress - Address of the token to withdraw
 * @param {number} amount - Amount of tokens to withdraw
 * @returns {Promise<Object>} Withdrawal result
 */
async function withdrawTokens(userId, tokenAddress, amount) {
  const response = await fetch(`${METAL_API_BASE_URL}/holder/${userId}/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': METAL_API_KEY,
    },
    body: JSON.stringify({
      tokenAddress,
      amount,
    }),
  });
  return response.json();
}

/**
 * Spend tokens from a holder's wallet
 * @param {string} userId - External ID of the holder
 * @param {string} tokenAddress - Address of the token to spend
 * @param {number} amount - Amount of tokens to spend
 * @returns {Promise<Object>} Spending result
 */
async function spendTokens(userId, tokenAddress, amount) {
  const response = await fetch(`${METAL_API_BASE_URL}/holder/${userId}/spend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': METAL_API_KEY,
    },
    body: JSON.stringify({
      tokenAddress,
      amount,
    }),
  });
  return response.json();
}

/**
 * Create a new token with configurable parameters
 * @param {Object} params - Token creation parameters
 * @param {string} params.name - The name for your token (e.g., "Test Token")
 * @param {string} params.symbol - The ticker symbol for your token (e.g., "TEST")
 * @param {boolean} [params.canDistribute] - Enable distribution functionality for this token
 * @param {boolean} [params.canLP] - Enable liquidity pool creation for this token
 * @param {string} [params.merchantAddress] - The address to receive the merchant token allocation
 * @returns {Promise<Object>} Job ID for tracking token creation status
 */
async function createToken(params) {
  const response = await fetch(`${METAL_API_BASE_URL}/merchant/create-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': METAL_API_KEY,
    },
    body: JSON.stringify(params),
  });
  return response.json();
}

/**
 * Get the status of a token creation job
 * @param {string} jobId - Job ID of the token creation
 * @returns {Promise<Object>} Token creation status and details if successful
 */
async function getTokenCreationStatus(jobId) {
  const response = await fetch(`${METAL_API_BASE_URL}/merchant/create-token/status/${jobId}`, {
    headers: {
      'x-api-key': METAL_API_KEY,
    },
  });
  return response.json();
}

module.exports = {
  createToken,
  getTokenCreationStatus,
  getToken,
  getOrCreateHolder,
  distributeTokens,
  getTokenWithHolders,
  getHolder,
  withdrawTokens,
  spendTokens,
};
