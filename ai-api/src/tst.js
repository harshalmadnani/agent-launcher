const { generateSwapTransaction, getSwapQuote, getApproveTransaction, swap, signbase, approve } = require('./functions/swap');
require('dotenv').config();

// Constants
const API_KEY = "ab4VmoqAepOnY86Y47rB86AIvvYvCHP4"; // Not used anymore as it's hardcoded in swap.js
const BASE_CHAIN_ID = 8453; // Chain ID for Base network
const SENDER_ADDRESS = '0xa5F8A22D2ee33281ca772f0eB18C04A32314bf6B';
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // Standard address for ETH on 1inch
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
const ETH_AMOUNT = '3000000000000'; // 0.000003 ETH in wei
const USDC_AMOUNT = '3000000'; // 3 USDC (assuming 6 decimals)

// Helper function to format token amounts with proper decimals
function formatTokenAmount(amount, decimals = 6) {
  if (!amount) return 'N/A';
  return (parseInt(amount) / Math.pow(10, decimals)).toFixed(decimals);
}

async function testSwap() {
  console.log('Testing swap on Base network (Chain ID:', BASE_CHAIN_ID, ')');
  console.log('Sender address:', SENDER_ADDRESS);
  console.log('Swapping 0.000003 ETH to USDC');
  
  try {
    // First, get a quote
    console.log('Getting swap quote...');
    const quote = await getSwapQuote(
      ETH_ADDRESS,
      USDC_ADDRESS,
      ETH_AMOUNT,
      BASE_CHAIN_ID
    );
    
    if (quote) {
      console.log('Quote received:');
      console.log(JSON.stringify(quote, null, 2));
      
      // Display the relevant information using the correct field names
      console.log('\nQuote Summary:');
      if (quote.dstAmount) {
        console.log('- Expected USDC amount:', formatTokenAmount(quote.dstAmount), 'USDC');
        console.log('- Raw destination amount:', quote.dstAmount);
      } else {
        console.log('- Expected output amount: Information not available in response');
      }
      
      // Generate the swap transaction
      console.log('\nGenerating swap transaction...');
      const swapTransaction = await generateSwapTransaction(
        ETH_ADDRESS,
        USDC_ADDRESS,
        ETH_AMOUNT,
        SENDER_ADDRESS,
        SENDER_ADDRESS,  // Origin is the same as sender
        0.5,             // 0.5% slippage
        BASE_CHAIN_ID
      );
      
      if (swapTransaction) {
        console.log('Swap transaction generated successfully:');
        console.log(JSON.stringify(swapTransaction, null, 2));
        
        console.log('\nTransaction Summary:');
        if (swapTransaction.tx) {
          console.log('\nTransaction details:');
          console.log('- TX data:', swapTransaction.tx.data ? swapTransaction.tx.data.substring(0, 66) + '...' : 'Not available');
          console.log('- Gas limit:', swapTransaction.tx.gas || 'Not available');
          console.log('- To address:', swapTransaction.tx.to || 'Not available');
          console.log('- Value:', swapTransaction.tx.value || 'Not available');
          console.log('- Gas price:', swapTransaction.tx.gasPrice || 'Not available', 'wei');
        }
      } else {
        console.log('Failed to generate swap transaction.');
      }
    } else {
      console.log('Failed to get swap quote.');
    }
  } catch (error) {
    console.error('Error in testSwap:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      if (error.response.status === 401) {
        console.error('Authentication failed: Please check that your API key is valid.');
      }
    }
  }
}

// Test the combined swap function 
async function testCombinedSwap() {
  console.log('Testing combined swap and sign function...');
  
  try {
    // Call the swap function that combines generation and signing
    const signedTransaction = await swap(
      ETH_ADDRESS,
      USDC_ADDRESS,
      ETH_AMOUNT,
      SENDER_ADDRESS,
      SENDER_ADDRESS,  // Origin is the same as sender
      0.5,             // 0.5% slippage
      BASE_CHAIN_ID
    );
    
    if (signedTransaction) {
      console.log('Transaction was successfully generated and signed:');
      console.log(JSON.stringify(signedTransaction, null, 2));
    } else {
      console.log('Failed to generate and sign swap transaction.');
    }
  } catch (error) {
    console.error('Error in testCombinedSwap:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Test the getApproveTransaction function
async function testApproveTransaction() {
  console.log('Testing getApproveTransaction on Base network (Chain ID:', BASE_CHAIN_ID, ')');
  console.log('Sender address:', SENDER_ADDRESS);
  console.log('Getting approve transaction for USDC...');
  
  try {
    // First try with a token (USDC)
    console.log('\nGetting approve transaction for USDC token...');
    const approveUsdcTx = await getApproveTransaction(
      USDC_ADDRESS,
      USDC_AMOUNT,
      SENDER_ADDRESS,
      BASE_CHAIN_ID
    );
    
    if (approveUsdcTx) {
      console.log('Approve transaction generated successfully:');
      console.log(JSON.stringify(approveUsdcTx, null, 2));
    } else {
      console.log('Failed to generate approve transaction for USDC.');
    }
    
    // Then try with ETH (should return noApprovalNeeded flag)
    console.log('\nTesting with ETH (should indicate no approval needed)...');
    const approveEthTx = await getApproveTransaction(
      ETH_ADDRESS,
      ETH_AMOUNT,
      SENDER_ADDRESS,
      BASE_CHAIN_ID
    );
    
    if (approveEthTx) {
      console.log('Response for ETH approval:');
      console.log(JSON.stringify(approveEthTx, null, 2));
      
      if (approveEthTx.noApprovalNeeded) {
        console.log('✅ Correctly identified that ETH does not need approval');
      }
    } else {
      console.log('Failed to generate response for ETH approval check.');
    }
  } catch (error) {
    console.error('Error in testApproveTransaction:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Test signing the approve transaction with signbase
async function testSignedApproveTransaction() {
  console.log('Testing signed approve transaction on Base network (Chain ID:', BASE_CHAIN_ID, ')');
  console.log('Sender address:', SENDER_ADDRESS);
  console.log('Getting and signing approve transaction for USDC...');
  
  try {
    // Get approve transaction for USDC
    console.log('\nGetting approve transaction for USDC token...');
    const approveUsdcTx = await getApproveTransaction(
      USDC_ADDRESS,
      USDC_AMOUNT,
      SENDER_ADDRESS,
      BASE_CHAIN_ID
    );
    
    if (!approveUsdcTx) {
      console.log('Failed to generate approve transaction for USDC.');
      return;
    }
    
    console.log('Approve transaction generated successfully:');
    console.log(JSON.stringify(approveUsdcTx, null, 2));
    
    // Sign the approve transaction using signbase
    console.log('\nSigning the approve transaction with signbase...');
    console.log(`Using chain ID: ${BASE_CHAIN_ID}`);
    const signedApproveTransaction = await signbase(approveUsdcTx.tx, BASE_CHAIN_ID);
    
    if (signedApproveTransaction) {
      console.log('Approve transaction was successfully signed:');
      const stringifiedOutput = JSON.stringify(signedApproveTransaction, null, 2);
      console.log(stringifiedOutput);
      
      // Also log the raw stringified output for easy copying
      console.log('\nStringified output (single line):');
      console.log(JSON.stringify(signedApproveTransaction));
    } else {
      console.log('Failed to sign approve transaction.');
    }
  } catch (error) {
    console.error('Error in testSignedApproveTransaction:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
      console.error('Request URL:', error.config ? error.config.url : 'unknown');
    }
  }
}


function main() {
    console.log("123123");
    // testCombinedSwap();
    testSignedApproveTransaction();
}

main();

// Export the functions for use in other scripts
module.exports = {
  testSwap,
  testCombinedSwap,
  testApproveTransaction,
  testSignedApproveTransaction,
};
