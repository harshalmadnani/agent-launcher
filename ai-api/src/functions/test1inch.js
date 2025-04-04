const {
  getPortfolioValueChart,
  generatePortfolioChart,
  getAndGeneratePortfolioChart,
  getCurrentValue,
  getProfitAndLoss,
  getTokenDetails,
  getNFTsByAddress
} = require('./1inch');

// Test address and chain ID
const TEST_ADDRESS = "0x7E3bBf75aba09833f899bB1FDd917FC3A5617555";
const CHAIN_ID = "8453"; // Base chain

// Timestamps for PnL testing
const FROM_TIMESTAMP = "2023-01-01T00:00:00Z";
const TO_TIMESTAMP = "2023-12-31T23:59:59Z";

// Default chain IDs for NFT testing
const DEFAULT_CHAIN_IDS = [1, 137, 8453, 42161, 43114, 8217];

async function testEndpoint(name, fn, ...args) {
  try {
    console.log(`\nTesting ${name}...`);
    const result = await fn(...args);
    console.log(`${name} Response:`, JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error(`Error in ${name}:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      url: error.config?.url
    });
    return false;
  }
}

async function testChartGeneration() {
  try {
    console.log("\nTesting Chart Generation...");
    
    // First get the portfolio data
    const data = await getPortfolioValueChart(TEST_ADDRESS, CHAIN_ID, "1day");
    
    // Generate chart from existing data
    const chartPath1 = await generatePortfolioChart(data, 'portfolio_chart1.png');
    console.log(`Chart 1 generated at: ${chartPath1}`);
    
    // Get data and generate chart in one step
    const result = await getAndGeneratePortfolioChart(
      TEST_ADDRESS,
      CHAIN_ID,
      "1day",
      'portfolio_chart2.png'
    );
    console.log(`Chart 2 generated at: ${result.chartPath}`);
    console.log("Portfolio data:", JSON.stringify(result.data, null, 2));
    
    return true;
  } catch (error) {
    console.error("Error in chart generation test:", error);
    return false;
  }
}

async function testAllEndpoints() {
  console.log("Starting 1inch Portfolio API Tests...");
  console.log(`Using test address: ${TEST_ADDRESS}`);
  console.log(`Using chain ID: ${CHAIN_ID}\n`);

  const results = {
    valueChart: await testEndpoint(
      "Portfolio Value Chart",
      getPortfolioValueChart,
      TEST_ADDRESS,
      CHAIN_ID,
      "1day"
    ),
    currentValue: await testEndpoint(
      "Current Value",
      getCurrentValue,
      TEST_ADDRESS,
      CHAIN_ID
    ),
    profitAndLoss: await testEndpoint(
      "Profit and Loss",
      getProfitAndLoss,
      TEST_ADDRESS,
      CHAIN_ID,
      FROM_TIMESTAMP,
      TO_TIMESTAMP
    ),
    tokenDetails: await testEndpoint(
      "Token Details",
      getTokenDetails,
      TEST_ADDRESS,
      CHAIN_ID
    ),
    nfts: await testEndpoint(
      "NFTs by Address",
      getNFTsByAddress,
      TEST_ADDRESS,
      DEFAULT_CHAIN_IDS
    ),
    chartGeneration: await testChartGeneration()
  };

  console.log("\nTest Summary:");
  console.log("----------------------------------------");
  Object.entries(results).forEach(([endpoint, success]) => {
    console.log(`${endpoint}: ${success ? "✅ Success" : "❌ Failed"}`);
  });
  console.log("----------------------------------------");

  const totalEndpoints = Object.keys(results).length;
  const successfulEndpoints = Object.values(results).filter(Boolean).length;
  console.log(`\nTest Results: ${successfulEndpoints}/${totalEndpoints} endpoints successful`);
}

// Run the tests
testAllEndpoints();
