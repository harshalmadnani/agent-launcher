const { getFusionQuote } = require('./functions/fusion');

async function testFusionQuote() {
  try {
    // API key for 1inch
    const apiKey = "ab4VmoqAepOnY86Y47rB86AIvvYvCHP4";
    
    // Test parameters
    const srcChain = "1"; // Ethereum
    const dstChain = "137"; // Polygon
    const srcTokenAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"; // WETH on Ethereum
    const dstTokenAddress = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"; // USDC on Polygon
    const amount = "100000000000000000"; // 0.1 ETH in wei
    const walletAddress = "0x7E3bBf75aba09833f899bB1FDd917FC3A5617555";
    const enableEstimate = "true";
    const fee = "0";
    
    console.log("Testing getFusionQuote...");
    
    const quote = await getFusionQuote(
      srcChain,
      dstChain,
      srcTokenAddress,
      dstTokenAddress,
      amount,
      walletAddress,
      enableEstimate,
      fee,
      apiKey
    );
    
    if (quote) {
      console.log("✅ Fusion Quote result:");
      console.log(JSON.stringify(quote, null, 2));
    } else {
      console.log("❌ Failed to get fusion quote");
    }
    
    return "Test completed!";
  } catch (error) {
    console.error("Test failed:", error);
    return { error: true, message: error.message };
  }
}

// Run the test
testFusionQuote()
  .then(result => console.log(result))
  .catch(err => console.error("Unhandled error:", err)); 