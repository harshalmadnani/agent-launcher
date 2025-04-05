const { getPortfolioValueChart, safeGetPortfolioValueChart, getCurrentValue } = require('./functions/1inch');

async function testPortfolioValue() {
  try {
    const walletAddress = "0x7E3bBf75aba09833f899bB1FDd917FC3A5617555";
    
    console.log("Testing direct function calls:");
    
    try {
      // Test the current value function (should work)
      console.log("Testing getCurrentValue...");
      const currentValue = await getCurrentValue(walletAddress, 1);
      console.log("✅ Current Value result:", JSON.stringify(currentValue, null, 2).slice(0, 300) + "...");
    } catch (error) {
      console.error("❌ getCurrentValue error:", error.message);
    }
    
    try {
      // Test with the correct timerange format
      console.log("\nTesting getPortfolioValueChart with correct timerange...");
      const portfolioChart = await getPortfolioValueChart([walletAddress], 1, "1month");
      console.log("✅ Portfolio Chart result:", JSON.stringify(portfolioChart, null, 2).slice(0, 300) + "...");
    } catch (error) {
      console.error("❌ getPortfolioValueChart error:", error.message);
    }
    
    // Test short format conversion
    try {
      console.log("\nTesting getPortfolioValueChart with short format (30d)...");
      const portfolioChartShort = await getPortfolioValueChart([walletAddress], 1, "30d");
      console.log("✅ Portfolio Chart (short format) result:", JSON.stringify(portfolioChartShort, null, 2).slice(0, 300) + "...");
    } catch (error) {
      console.error("❌ getPortfolioValueChart (short format) error:", error.message);
    }
    
    // Test the safer function
    console.log("\nTesting safer safeGetPortfolioValueChart...");
    const safePortfolioChart = await safeGetPortfolioValueChart([walletAddress], 1, "1month");
    console.log("✅ Safe Portfolio Chart result:", JSON.stringify(safePortfolioChart, null, 2).slice(0, 300) + "...");
    
    return "Tests completed!";
  } catch (error) {
    console.error("Test failed:", error);
    return { error: true, message: error.message };
  }
}

// Run the test
testPortfolioValue()
  .then(result => console.log(result))
  .catch(err => console.error("Unhandled error:", err)); 