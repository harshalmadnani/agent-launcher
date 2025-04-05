import { SDK, NetworkEnum, getRandomBytes32, HashLock, QuoteParams } from "@1inch/cross-chain-sdk";
import { solidityPackedKeccak256 } from "ethers";

/**
 * 1inch Fusion+ SDK implementation
 * Documentation: https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/sdk-overview
 */

// SDK initialization with configuration
const initFusionSDK = (apiKey, blockchainProvider) => {
  if (!apiKey) {
    throw new Error("API key is required for 1inch Fusion+ SDK");
  }

  // Initialize the SDK with the provided API key and blockchain provider
  const sdk = new SDK({
    url: "https://api.1inch.dev/fusion-plus",
    network: NetworkEnum.ETHEREUM,
    authKey: apiKey,
    blockchainProvider
  });

  return sdk;
};

/**
 * Gets a quote for a cross-chain swap
 * @param {SDK} sdk - The initialized 1inch SDK instance
 * @param {Object} params - Parameters for the quote
 * @param {NetworkEnum} params.srcChainId - Source chain ID
 * @param {NetworkEnum} params.dstChainId - Destination chain ID
 * @param {string} params.srcTokenAddress - Source token address
 * @param {string} params.dstTokenAddress - Destination token address
 * @param {string} params.amount - Amount to swap (in wei)
 * @param {boolean} [params.enableEstimate] - Whether to enable estimation
 * @param {string} [params.walletAddress] - User's wallet address
 * @returns {Promise<Quote>} - The quote object
 */
const getQuote = async (sdk, params) => {
  try {
    const quote = await sdk.getQuote(params);
    return quote;
  } catch (error) {
    console.error("Error getting quote:", error);
    throw error;
  }
};

// Function to create swap order
const createSwapOrder = async (sdk, params) => {
  try {
    const order = await sdk.createOrder(params);
    return order;
  } catch (error) {
    console.error("Error creating swap order:", error);
    throw error;
  }
};

// Function to get order status
const getOrderStatus = async (sdk, orderId) => {
  try {
    const status = await sdk.getOrderStatus(orderId);
    return status;
  } catch (error) {
    console.error("Error getting order status:", error);
    throw error;
  }
};

/**
 * Places a cross-chain order using the provided quote and parameters
 * @param {SDK} sdk - The initialized 1inch SDK instance
 * @param {Quote} quote - The quote object obtained from getQuote
 * @param {Object} orderParams - Parameters for the order
 * @param {string} orderParams.walletAddress - User's wallet address
 * @param {Object} [orderParams.fee] - Optional fee configuration
 * @param {number} [orderParams.fee.takingFeeBps] - Fee in basis points (1% = 100bps)
 * @param {string} [orderParams.fee.takingFeeReceiver] - Address that receives the fee
 * @returns {Promise<Object>} - Order details
 */
const placeOrder = async (sdk, quote, orderParams) => {
  try {
    const secretsCount = quote.getPreset().secretsCount;
    
    // Generate secrets and their hashes
    const secrets = Array.from({ length: secretsCount }).map(() => getRandomBytes32());
    const secretHashes = secrets.map((x) => HashLock.hashSecret(x));
    
    // Create hashLock based on secretsCount
    const hashLock = secretsCount === 1
      ? HashLock.forSingleFill(secrets[0])
      : HashLock.forMultipleFills(
          secretHashes.map((secretHash, i) =>
            solidityPackedKeccak256(["uint64", "bytes32"], [i, secretHash.toString()])
          ) 
        );
    
    // Build order parameters
    const params = {
      walletAddress: orderParams.walletAddress,
      hashLock,
      secretHashes,
    };
    
    // Add optional fee if provided
    if (orderParams.fee) {
      params.fee = {
        takingFeeBps: orderParams.fee.takingFeeBps,
        takingFeeReceiver: orderParams.fee.takingFeeReceiver
      };
    }
    
    // Place the order
    const order = await sdk.placeOrder(quote, params);
    return order;
  } catch (error) {
    console.error("Error placing order:", error);
    throw error;
  }
};

// Function to get supported networks
const getSupportedNetworks = () => {
  return Object.keys(NetworkEnum).map(key => ({
    name: key,
    id: NetworkEnum[key]
  }));
};

export {
  initFusionSDK,
  getQuote,
  createSwapOrder,
  getOrderStatus,
  placeOrder,
  getSupportedNetworks,
  NetworkEnum,
  getRandomBytes32,
  HashLock,
  QuoteParams
};