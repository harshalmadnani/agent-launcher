const axios = require("axios");
const { Chart, registerables } = require('chart.js');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Register all Chart.js components
Chart.register(...registerables);

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
async function getPortfolioValueChart(addresses, chainId, timerange = "1day", useCache = "true") {
  return makeApiRequest('/general/value_chart', {
    addresses: Array.isArray(addresses) ? addresses : [addresses],
    chain_id: chainId,
    timerange: timerange,
    use_cache: useCache
  });
}

// Generate chart from portfolio value data
async function generatePortfolioChart(data, outputPath = 'portfolio_chart.png') {
  try {
    // Create canvas
    const canvas = createCanvas(1200, 600);
    const ctx = canvas.getContext('2d');

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

    // Create chart
    new Chart(ctx, {
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
        responsive: true,
        maintainAspectRatio: false,
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
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                return `$${context.raw.toFixed(2)}`;
              }
            }
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
              minRotation: 45
            }
          }
        }
      }
    });

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

// Get portfolio data and generate chart
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

// Get current value for supported ERC20 tokens
async function getCurrentValue(walletAddress, chainId) {
  return makeApiRequest('/overview/erc20/current_value', {
    addresses: Array.isArray(walletAddress) ? walletAddress : [walletAddress],
    chain_id: chainId
  });
}

// Get profit and loss (PnL) and return on investment (ROI) for supported tokens
async function getProfitAndLoss(walletAddress, chainId, fromTimestamp, toTimestamp) {
  return makeApiRequest('/overview/erc20/profit_and_loss', {
    addresses: Array.isArray(walletAddress) ? walletAddress : [walletAddress],
    chain_id: chainId,
    from_timestamp: fromTimestamp,
    to_timestamp: toTimestamp
  });
}

// Get detailed information for supported tokens
async function getTokenDetails(walletAddress, chainId) {
  return makeApiRequest('/overview/erc20/details', {
    addresses: Array.isArray(walletAddress) ? walletAddress : [walletAddress],
    chain_id: chainId
  });
}

// Get NFTs by address
async function getNFTsByAddress(address, chainIds = [1, 137, 8453, 42161, 43114, 8217]) {
  const url = "https://api.1inch.dev/nft/v2/byaddress";
  const config = {
    headers: {
      "Authorization": `Bearer ${API_KEY}`
    },
    params: {
      chainIds,
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

module.exports = {
  getPortfolioValueChart,
  generatePortfolioChart,
  getAndGeneratePortfolioChart,
  getCurrentValue,
  getProfitAndLoss,
  getTokenDetails,
  getNFTsByAddress
};