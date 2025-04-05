const { swap, getSwapQuote } = require('./functions/swap');
require('dotenv').config();

const BASE_CHAIN_ID = 8453; // Chain ID for Base network
const SENDER_ADDRESS = '0xa5F8A22D2ee33281ca772f0eB18C04A32314bf6B';
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // Standard address for ETH on 1inch
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Correct USDC on Base
const USDC_AMOUNT = '1000000'; // 1 USDC (assuming 6 decimals)

async function testUSDCtoETHSwap() {
  console.log('Testing USDC to ETH swap on Base network (Chain ID:', BASE_CHAIN_ID, ')');
  console.log('Sender address:', SENDER_ADDRESS);
  console.log('Swapping 1 USDC to ETH');
  
  try {
    // First, get a quote
    console.log('Getting swap quote...');
    const quote = await getSwapQuote(
      USDC_ADDRESS,
      ETH_ADDRESS,
      USDC_AMOUNT,
      BASE_CHAIN_ID
    );
    
    if (quote) {
      console.log('Quote received:');
      console.log(JSON.stringify(quote, null, 2));
      
      // Perform the swap
      console.log('\nPerforming swap...');
      const swapResult = await swap(
        USDC_ADDRESS,
        ETH_ADDRESS,
        USDC_AMOUNT,
        SENDER_ADDRESS,
        SENDER_ADDRESS, // Origin same as sender
        0.5, // 0.5% slippage
        BASE_CHAIN_ID
      );
      
      if (swapResult) {
        console.log('Swap performed successfully:');
        console.log(JSON.stringify(swapResult, null, 2));
      } else {
        console.log('Failed to perform swap.');
      }
    } else {
      console.log('Failed to get swap quote.');
    }
  } catch (error) {
    console.error('Error in testUSDCtoETHSwap:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testUSDCtoETHSwap().then(() => {
  console.log('USDC to ETH swap test completed.');
}); 