const axios = require("axios");
const { Chart, registerables } = require('chart.js');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Register all Chart.js components
Chart.register(...registerables);

// Configure Chart.js for Node environment
Chart.defaults.font.family = 'Arial';
Chart.defaults.color = '#666';
// Set global animation to false for server-side rendering
Chart.defaults.animation = false;

const BASE_URL = "https://api.1inch.dev/portfolio/portfolio/v4";
const API_KEY = "ab4VmoqAepOnY86Y47rB86AIvvYvCHP4";

const defaultConfig = {
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Accept": "application/json"
  },
  paramsSerializer: {
    indexes: null
  }
};

// Helper function to handle API responses
async function makeApiRequest(endpoint, params = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      ...defaultConfig,
      params
    };
    const response = await axios.get(url, config);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`API Error (${error.response.status}):`, {
        url: error.config?.url,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else {
      console.error('Network Error:', error.message);
    }
    throw error;
  }
}

// Get portfolio value chart data
async function getPortfolioValueChart(addresses, chainId = 1, timerange = "1month", useCache = true) {
  // Map short formats to required API formats
  const timerangeMap = {
    '1d': '1day',
    '7d': '1week',
    '30d': '1month',
    '1y': '1year',
    '3y': '3years'
  };
  
  // Convert timerange if using short format
  const apiTimerange = timerangeMap[timerange] || timerange;
  
  return makeApiRequest('/general/value_chart', {
    addresses: Array.isArray(addresses) ? addresses : [addresses],
    chain_id: chainId.toString(),
    timerange: apiTimerange,
    use_cache: useCache.toString() // Convert boolean to string
  });
}

// Safer wrapper for portfolio chart that handles errors gracefully
async function safeGetPortfolioValueChart(addresses, chainId = 1, timerange = "30d", useCache = true) {
  try {
    // Try to get the portfolio value chart
    return await getPortfolioValueChart(addresses, chainId, timerange, useCache);
  } catch (error) {
    console.error("Portfolio chart API error:", error.message);
    
    // If the API fails, return a structured error object with helpful information
    return {
      error: true,
      code: error.response?.status || 500,
      message: "Unable to retrieve portfolio chart data",
      errorDetails: error.response?.data || error.message,
      // Return empty placeholder data for graceful fallback
      result: [],
      meta: {
        status: "error",
        error_message: error.message
      }
    };
  }
}

// Generate chart from portfolio value data
async function generatePortfolioChart(data, outputPath = 'portfolio_chart.png') {
  try {
    // Create canvas
    const width = 1200;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Set background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Check if data is in the expected format
    if (!data || !data.result || !Array.isArray(data.result)) {
      throw new Error('Invalid data format. Expected { result: Array }');
    }

    if (!data.result.length) {
      throw new Error('No portfolio data available');
    }

    // Extract timestamps and values
    const timestamps = data.result.map(item => {
      const date = new Date(item.timestamp * 1000);
      return date.toLocaleString();
    });
    const values = data.result.map(item => parseFloat(item.value_usd));

    // Create chart with Node.js compatibility settings
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: timestamps,
        datasets: [{
          label: 'Portfolio Value (USD)',
          data: values,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: false, // Important for Node environment
        maintainAspectRatio: false,
        animation: false, // Disable animations for server-side rendering
        plugins: {
          title: {
            display: true,
            text: 'Portfolio Value Over Time',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          tooltip: {
            enabled: false, // Disable tooltips for server-side rendering
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Value (USD)',
              font: {
                weight: 'bold'
              }
            },
            ticks: {
              callback: function(value) {
                return '$' + value.toFixed(2);
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date',
              font: {
                weight: 'bold'
              }
            },
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              maxTicksLimit: 8 // Limit number of labels to prevent overcrowding
            }
          }
        }
      }
    });
    
    // Render the chart
    chart.render();

    // Save the chart as PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Chart saved to ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error generating chart:', error);
    throw error;
  }
}

// Upload chart image to Supabase storage
async function uploadChartToSupabase(supabase, imagePath, bucketName = 'portfolio') {
  try {
    // Read the file from the file system
    const fileBuffer = fs.readFileSync(imagePath);
    const fileExt = path.extname(imagePath);
    const fileName = `charts/${Date.now()}${fileExt}`;
    
    // Upload the file to Supabase Storage (assuming bucket exists)
    const { error: uploadError, data } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true  // Use upsert instead of creating new file to overcome RLS issues
      });
    
    if (uploadError) throw uploadError;
    
    // Construct the direct storage URL using the correct format
    // Format: https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/<file-path>
    const projectRef = supabase.supabaseUrl.match(/https:\/\/(.*?)\.supabase/)[1];
    const storageUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/${bucketName}/${fileName}`;
    
    return {
      success: true,
      publicUrl: storageUrl,
      fileName
    };
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Comprehensive function to get data, generate chart, and upload to Supabase in one step
async function getGenerateAndUploadPortfolioChart(addresses, chainId, timerange = "1day") {
  try {
    // Hardcoded Supabase credentials
    const supabaseUrl = 'https://wbsnlpviggcnwqfyfobh.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key-here';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the portfolio data
    const data = await getPortfolioValueChart(addresses, chainId, timerange);
    
    // Create a temporary path for the chart
    const tempChartPath = path.join(require('os').tmpdir(), `temp_chart_${Date.now()}.png`);
    
    // Generate and save the chart to the temporary location
    await generatePortfolioChart(data, tempChartPath);
    
    // Upload the chart to Supabase
    const bucketName = 'portfolio';
    const fileBuffer = fs.readFileSync(tempChartPath);
    const fileExt = path.extname(tempChartPath);
    const fileName = `charts/${Date.now()}${fileExt}`;
    
    console.log(`Uploading to ${bucketName}/${fileName}...`);
    const { error: uploadError, data: uploadData } = await supabase.storage
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
    
    // Construct the direct storage URL
    const projectRef = 'wbsnlpviggcnwqfyfobh';
    const storageUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/${bucketName}/${fileName}`;
    
    // Delete the temporary file
    fs.unlinkSync(tempChartPath);
    
    // Return only the public URL
    return storageUrl;
  } catch (error) {
    console.error('Error in getGenerateAndUploadPortfolioChart:', error);
    throw error;
  }
}

// Get current value for supported ERC20 tokens
async function getCurrentValue(walletAddress, chainId) {
  return makeApiRequest('/overview/erc20/current_value', {
    addresses: Array.isArray(walletAddress) ? walletAddress : [walletAddress],
    chain_id: chainId.toString()
  });
}

// Get profit and loss (PnL) and return on investment (ROI) for supported tokens
async function getProfitAndLoss(walletAddress, chainId, fromTimestamp, toTimestamp) {
  return makeApiRequest('/overview/erc20/profit_and_loss', {
    addresses: Array.isArray(walletAddress) ? walletAddress : [walletAddress],
    chain_id: chainId.toString(),
    from_timestamp: fromTimestamp,
    to_timestamp: toTimestamp
  });
}

// Get detailed information for supported tokens
async function getTokenDetails(walletAddress, chainId) {
  const url = "https://api.1inch.dev/portfolio/portfolio/v4/overview/erc20/details";

  const config = {
    headers: {
      "Authorization": "Bearer ab4VmoqAepOnY86Y47rB86AIvvYvCHP4"
    },
    params: {
      "addresses": Array.isArray(walletAddress) ? walletAddress : [walletAddress],
      "chain_id": chainId.toString(),
      "closed": true,
      "closed_threshold": 1
    },
    paramsSerializer: {
      indexes: null
    }
  };

  try {
    const response = await axios.get(url, config);
    
    // Check if response has the expected structure
    if (!response.data || !response.data.result) {
      return {
        result: [],
        error: 'Invalid response format from API',
        meta: response.data?.meta || {}
      };
    }

    return response.data;
  } catch (error) {
    console.error('Error in getTokenDetails:', error);
    return {
      result: [],
      error: error.response?.data?.message || error.message,
      meta: {
        system: {
          error: true,
          error_message: error.message
        }
      }
    };
  }
}

// Get NFTs by address
async function getNFTsByAddress(address, chainIds = [1, 137, 8453, 42161, 43114, 8217]) {
  const url = "https://api.1inch.dev/nft/v2/byaddress";
  const config = {
    headers: {
      "Authorization": `Bearer ${API_KEY}`
    },
    params: {
      chainIds: Array.isArray(chainIds) ? chainIds.map(id => id.toString()) : [chainIds.toString()],
      address
    },
    paramsSerializer: {
      indexes: null
    }
  };

  try {
    const response = await axios.get(url, config);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`API Error (${error.response.status}):`, {
        url: error.config?.url,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else {
      console.error('Network Error:', error.message);
    }
    throw error;
  }
}

// Test chart generation functionality
async function getAndGeneratePortfolioChart(addresses, chainId, timerange = "1day", outputPath = 'portfolio_chart.png') {
    try {
      // Get the portfolio data
      const data = await getPortfolioValueChart(addresses, chainId, timerange);
      
      // Generate and save the chart
      const chartPath = await generatePortfolioChart(data, outputPath);
      return {
        data,
        chartPath
      };
    } catch (error) {
      console.error('Error in getAndGeneratePortfolioChart:', error);
      throw error;
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
    console.log(`Chart 2 generated at: ${result}`);
    console.log("Portfolio data:", JSON.stringify(result, null, 2));
    
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

module.exports = {
  getPortfolioValueChart,
  safeGetPortfolioValueChart,
  getCurrentValue,
  getProfitAndLoss,
  getTokenDetails,
  getNFTsByAddress,
  getGenerateAndUploadPortfolioChart
};