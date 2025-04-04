const metal = require('./metal');

async function testMetalFunctions() {
  try {
    console.log('Testing Metal API functions...\n');

    // Test createToken
    console.log('1. Testing createToken...');
    const tokenParams = {
      name: 'Test Token',
      symbol: 'TEST',
    };
    const createTokenResult = await metal.createToken(tokenParams);
    console.log('Create Token Result:', createTokenResult);

    // Test getTokenCreationStatus
    console.log('\n2. Testing getTokenCreationStatus...');
    const jobId = createTokenResult.jobId;
    const tokenStatus = await metal.getTokenCreationStatus(jobId);
    console.log('Token Creation Status:', tokenStatus);

    // Test distributeTokens
    console.log('\n3. Testing distributeTokens...');
    const tokenAddress = tokenStatus.data.address;
    const distributeResult = await metal.distributeTokens(
      tokenAddress,
      '0xabcdef1234567890abcdef1234567890abcdef12',
      100
    );
    console.log('Distribute Tokens Result:', distributeResult);

    // Test createLiquidity
    console.log('\n4. Testing createLiquidity...');
    const liquidityResult = await metal.createLiquidity(tokenAddress);
    console.log('Create Liquidity Result:', liquidityResult);

    // Test launchToken
    console.log('\n5. Testing launchToken...');
    const launchResult = await metal.launchToken(
      'Launch Test Token',
      'LTT',
      '0xabcdef1234567890abcdef1234567890abcdef12'
    );
    console.log('Launch Token Result:', launchResult);

  } catch (error) {
    console.error('Error testing Metal functions:', error);
  }
}

// Run the tests
testMetalFunctions(); 