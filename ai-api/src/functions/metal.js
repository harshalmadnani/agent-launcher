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

async function distributeToUsernames(address, toUsername, amount) {
  try {
    // Get to address
    const toResponse = await fetch(`https://agent-launcher.onrender.com/user?username=${toUsername}`);
    const toData = await toResponse.json();
    if (!toData.success || !toData.address) {
      throw new Error(`Could not resolve address for recipient username: ${toUsername}`);
    }
    const toAddress = toData.address;

    // Call the existing distributeTokens function
    return await distributeTokens(address, toAddress, amount);
  } catch (error) {
    throw new Error(`Token distribution failed: ${error.message}`);
  }
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

async function launchToken(name, ticker, merchantAddress) {
  try {
    // Create token with default values for canLP and canDistribute
    const tokenResponse = await createToken({
      name,
      symbol: ticker,
      merchantAddress,
      canDistribute: true,
      canLP: true
    });

    if (!tokenResponse.jobId) {
      throw new Error('Failed to create token: No jobId received');
    }

    // Wait for 20 seconds before checking status
    await new Promise(resolve => setTimeout(resolve, 20000));

    // Check status and retry if pending
    let statusResponse;
    let tokenAddress;
    
    do {
      statusResponse = await getTokenCreationStatus(tokenResponse.jobId);
      
      if (statusResponse.status === 'pending') {
        // Wait another 20 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 20000));
      } else if (statusResponse.status === 'success') {
        tokenAddress = statusResponse.data?.address || statusResponse.tokenAddress;
        break;
      } else {
        throw new Error(`Token creation failed with status: ${statusResponse.status}`);
      }
    } while (statusResponse.status === 'pending');

    if (!tokenAddress) {
      throw new Error('Token address not found in the response');
    }

    // Wait 30 seconds before creating liquidity
    console.log('Token created successfully. Waiting 30 seconds before creating liquidity...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Retry logic for creating liquidity
    let liquidityResponse;
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      liquidityResponse = await createLiquidity(tokenAddress);
      
      // Check if the response indicates a successful operation
      if (!liquidityResponse.message || !liquidityResponse.httpCode) {
        break; // Success response
      }
      
      console.log(`Attempt ${retries + 1} failed: ${liquidityResponse.message}. Retrying in 10 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      retries++;
    }
    
    return {
      tokenCreation: statusResponse,
      liquidityCreation: liquidityResponse
    };

  } catch (error) {
    console.error('Error in launchToken:', error);
    throw error;
  }
}

module.exports = {
  createToken,
  getTokenCreationStatus,
  distributeTokens,
  distributeToUsernames,
  createLiquidity,
  launchToken
}; 