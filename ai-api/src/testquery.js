const axios = require('axios');

async function testAnalyzeQuery() {
  try {
    const response = await axios.post('http://localhost:3000/analyze', {
      query: "get the portfolio chart image for the address 0x7E3bBf75aba09833f899bB1FDd917FC3A5617555 on base chain for 1day",
      systemPrompt: "You are a helpful AI assistant that provides cryptocurrency analysis.Please keep your response under 200 characters",
      model: "deepseek-r1-distill-llama-70b"
    });

    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error response:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testAnalyzeQuery(); 