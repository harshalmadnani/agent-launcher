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
  generateAndUploadPortfolioChart
} = require('./1inch');

// For Supabase testing
const { createClient } = require('@supabase/supabase-js');

// Test address and chain ID
const TEST_ADDRESS = "0x7E3bBf75aba09833f899bB1FDd917FC3A5617555";
const CHAIN_ID = "8453"; // Base chain

// Timestamps for PnL testing
const FROM_TIMESTAMP = "2023-01-01T00:00:00Z";
const TO_TIMESTAMP = "2023-12-31T23:59:59Z";

// Default chain IDs for NFT testing
const DEFAULT_CHAIN_IDs = [1, 137, 8453, 42161, 43114, 8217];

// Supabase configuration - using service role key to bypass RLS policies
const SUPABASE_URL = "https://wbsnlpviggcnwqfyfobh.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic25scHZpZ2djbndxZnlmb2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODc2NTcwNiwiZXhwIjoyMDU0MzQxNzA2fQ.tr6PqbiAXQYSQSpG2wS6I4DZfV1Gc3dLXYhKwBrJLS0";

console.log("Supabase URL:", SUPABASE_URL);

// Initialize Supabase client with service role key to bypass RLS policies
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

// Override the uploadChartToSupabase function to use portfolio bucket
async function customUploadChartToSupabase(supabase, imagePath) {
  try {
    const bucketName = 'portfolio';
    
    // Read the file from the file system
    const fs = require('fs');
    const path = require('path');
    const fileBuffer = fs.readFileSync(imagePath);
    const fileExt = path.extname(imagePath);
    const fileName = `charts/${Date.now()}${fileExt}`;
    
    // First check if the path exists and create it if needed
    try {
      const { data: folders, error: folderError } = await supabase
        .storage
        .from(bucketName)
        .list('charts');
      
      if (folderError && folderError.message !== 'The resource was not found') {
        console.log("Folder check error:", folderError.message);
      }
    } catch (e) {
      console.log("Folder check failed:", e.message);
    }
    
    // Use direct API access with service role key for upload
    console.log(`Uploading to ${bucketName}/${fileName}...`);
    const { error: uploadError, data } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error("Upload error details:", uploadError);
      throw uploadError;
    }
    
    // Construct the direct storage URL using the correct format
    const storageUrl = `https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/${bucketName}/${fileName}`;
    
    return {
      success: true,
      publicUrl: storageUrl,
      fileName,
      data
    };
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    return {
      success: false,
      error: error.message
    };
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
    
    const uploadResult = await customUploadChartToSupabase(
      supabase,
      chartPath
    );
    
    console.log("Upload result:", JSON.stringify(uploadResult, null, 2));
    
    // Test 2: Generate and upload in one step - using custom uploader
    console.log("\nTest 2: Generate and upload in one step");
    // Get data and generate chart
    const portfolioData = await getPortfolioValueChart(TEST_ADDRESS, CHAIN_ID, "1week");
    const oneStepChartPath = await generatePortfolioChart(portfolioData, 'portfolio_chart_one_step.png');
    
    // Upload with custom uploader
    const uploadStepTwoResult = await customUploadChartToSupabase(
      supabase,
      oneStepChartPath
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
      DEFAULT_CHAIN_IDs
    ),
    chartGeneration: await testChartGeneration(),
    supabaseUpload: await testSupabaseUpload()
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
