// Load environment variables from .env file
require('dotenv').config({ path: require('path').resolve(__dirname, '../../..', '.env') });

const {
  getPortfolioValueChart,
  generatePortfolioChart,
  getAndGeneratePortfolioChart,
  getCurrentValue,
  getProfitAndLoss,
  getTokenDetails,
  getNFTsByAddress,
  uploadChartToSupabase,
  generateAndUploadPortfolioChart,
  getGenerateAndUploadPortfolioChart,
  getPortfolioBreakdown,
  generatePortfolioPieChart,
  supabase
} = require('./1inch');

// For Supabase testing
const { createClient } = require('@supabase/supabase-js');

// Test address and chain ID
const TEST_ADDRESS = "0x7E3bBf75aba09833f899bB1FDd917FC3A5617555";
const CHAIN_ID = 8453; // Base chain (as number, not string)

// Timestamps for PnL testing
const FROM_TIMESTAMP = "2023-01-01T00:00:00Z";
const TO_TIMESTAMP = "2023-12-31T23:59:59Z";

// Default chain IDs for NFT testing
const DEFAULT_CHAIN_IDs = [1, 137, 8453, 42161, 43114, 8217];

// Supabase configuration - using service role key to bypass RLS policies
const SUPABASE_URL = "https://wbsnlpviggcnwqfyfobh.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic25scHZpZ2djbndxZnlmb2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODc2NTcwNiwiZXhwIjoyMDU0MzQxNzA2fQ.tr6PqbiAXQYSQSpG2wS6I4DZfV1Gc3dLXYhKwBrJLS0";

console.log("Supabase URL:", SUPABASE_URL);

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

async function testPortfolioBreakdown() {
  try {
    console.log("\nTesting Portfolio Breakdown...");
    console.log(`Test Address: ${TEST_ADDRESS}`);
    console.log(`Chain ID: ${CHAIN_ID}`);
    
    const result = await getPortfolioBreakdown(TEST_ADDRESS, CHAIN_ID);
    
    if (!result.success) {
      console.error("Failed to get portfolio breakdown:", result.error);
      return false;
    }
    
    console.log("\nPortfolio Breakdown Results:");
    console.log(`Total Portfolio Value: $${result.totalValueUsd.toFixed(2)}`);
    
    if (result.pieChartUrl) {
      console.log(`\nPie Chart URL: ${result.pieChartUrl}`);
    }
    
    console.log("\nToken Allocation:");
    result.breakdown.forEach(token => {
      console.log(`\n${token.symbol} (${token.name}):`);
      console.log(`  Value: $${token.valueUsd.toFixed(2)}`);
      console.log(`  Percentage: ${token.percentage}%`);
      console.log(`  Balance: ${token.balance}`);
      console.log(`  Address: ${token.tokenAddress}`);
    });
    
    return true;
  } catch (error) {
    console.error("Error in portfolio breakdown test:", error);
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

async function testSupabaseUpload() {
  try {
    console.log("\nTesting Supabase Upload...");
    
    // Skip test if Supabase credentials are not configured
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.log('Skipping Supabase upload test - credentials not configured');
      return true;
    }
    
    console.log(`Using Supabase URL: ${SUPABASE_URL}`);
    console.log("Using service role key to bypass RLS policies");
    
    // Test 1: Upload an existing chart to Supabase using the portfolio bucket
    console.log("Test 1: Upload existing chart to portfolio bucket");
    const data = await getPortfolioValueChart(TEST_ADDRESS, CHAIN_ID, "1day");
    const chartPath = await generatePortfolioChart(data, 'portfolio_chart_upload.png');
    
    const uploadResult = await uploadChartToSupabase(supabase, chartPath, 'portfolio');
    
    console.log("Upload result:", JSON.stringify(uploadResult, null, 2));
    
    // Test 2: Generate and upload in one step - using custom uploader
    console.log("\nTest 2: Generate and upload in one step");
    // Get data and generate chart
    const portfolioData = await getPortfolioValueChart(TEST_ADDRESS, CHAIN_ID, "1week");
    const oneStepChartPath = await generatePortfolioChart(portfolioData, 'portfolio_chart_one_step.png');
    
    // Upload with custom uploader
    const uploadStepTwoResult = await uploadChartToSupabase(
      supabase,
      oneStepChartPath,
      'portfolio'
    );
    
    console.log("Combined result:", {
      chartPath: oneStepChartPath,
      uploadSuccess: uploadStepTwoResult.success,
      publicUrl: uploadStepTwoResult.publicUrl
    });
    
    return uploadResult.success || uploadStepTwoResult.success;
  } catch (error) {
    console.error("Error in Supabase upload test:", error);
    return false;
  }
}

async function testCombinedFunction() {
  try {
    console.log("Testing Combined Function (getGenerateAndUploadPortfolioChart)...");
    console.log(`Using Supabase URL: ${SUPABASE_URL}`);
    console.log(`Test address: ${TEST_ADDRESS}, Chain ID: ${CHAIN_ID}`);
    
    // Test with different timeranges
    const timeranges = ["1day", "1week", "1month"];
    let allTestsSuccessful = true;
    
    for (const timerange of timeranges) {
      console.log(`\nTesting timerange: ${timerange}`);
      console.time(`${timerange} execution time`);
      
      try {
        const url = await getGenerateAndUploadPortfolioChart(
          TEST_ADDRESS,
          CHAIN_ID,
          timerange
        );
        
        console.timeEnd(`${timerange} execution time`);
        console.log(`✅ Success for ${timerange}!`);
        console.log(`Chart URL: ${url}`);
      } catch (error) {
        console.timeEnd(`${timerange} execution time`);
        console.error(`❌ Failed for ${timerange}:`, error.message);
        allTestsSuccessful = false;
      }
    }
    
    return allTestsSuccessful;
  } catch (error) {
    console.error("\n❌ Error in combined function test:", error);
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
      "NFTs",
      getNFTsByAddress,
      TEST_ADDRESS,
      DEFAULT_CHAIN_IDs
    ),
    portfolioBreakdown: await testPortfolioBreakdown(),
    chartGeneration: await testChartGeneration(),
    supabaseUpload: await testSupabaseUpload(),
    combinedFunction: await testCombinedFunction()
  };

  console.log("\nTest Results Summary:");
  Object.entries(results).forEach(([test, success]) => {
    console.log(`${test}: ${success ? "✅ PASS" : "❌ FAIL"}`);
  });

  return Object.values(results).every(result => result);
}

// Run the test and provide summary
testAllEndpoints()
  .then(success => {
    console.log("\n----------------------------------------");
    console.log(`Overall Test Result: ${success ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);
    console.log("----------------------------------------");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("\n❌ Error running tests:", error);
    process.exit(1);
  });
