require('dotenv').config();

const METAL_API_BASE_URL = 'https://api.metal.build';
const METAL_API_KEY = "d215c5ad-f0ed-472c-9ff8-df9b03a56e69";
const METAL_SECRET_API_KEY = process.env.METAL_SECRET_API_KEY;

async function createToken({ name, symbol, merchantAddress, canDistribute, canLP }) {
  const response = await fetch('https://api.metal.build/merchant/create-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': "0cd876ac-d39c-5668-90af-654ad45c94ac"
    },
    body: JSON.stringify({
      name,
      symbol,
      merchantAddress,
      canDistribute,
      canLP
    }),
  })
  
  const token = await response.json()
  return token
}

async function getTokenCreationStatus(jobId) {
  const statusUrl = `https://api.metal.build/merchant/create-token/status/${jobId}`;
  const response = await fetch(statusUrl, {
    headers: { "x-api-key": "0cd876ac-d39c-5668-90af-654ad45c94ac" },
  });
  const statusResponse = await response.json();
  return statusResponse;
}

async function distributeTokens(address, sendTo, amount) {
  const response = await fetch(
    `https://api.metal.build/token/${address}/distribute`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': "0cd876ac-d39c-5668-90af-654ad45c94ac"
      },
      body: JSON.stringify({
        sendTo,
        amount
      }),
    }
  )

  const distribute = await response.json()
  return distribute
}

async function createLiquidity(address) {
  const response = await fetch(
    `https://api.metal.build/token/${address}/liquidity`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': "0cd876ac-d39c-5668-90af-654ad45c94ac"
      }
    }
  )

  const liquidity = await response.json()
  return liquidity
}

module.exports = {
  createToken,
  getTokenCreationStatus,
  distributeTokens,
  createLiquidity
}; 