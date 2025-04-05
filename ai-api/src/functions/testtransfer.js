require('dotenv').config();
const { transferEthToAddress, transferWithUsernames } = require('./transfer');

// Configuration
const config = {
    apiKey: process.env.API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzQzODM2NzE0LCJqdGkiOiJmZGViZTIwYS0xZGVmLTRiYWEtODYyZS00MWJmZWZmZjcxM2YifQ.cpG1R5Uyzoy6bL2-ijwV8HQOKk12JW9X4fuRr07qc7Q",
    baseUrl: process.env.BASE_URL || "https://sfhqqxqwkfaslnwm5ktynkxgja.multibaas.com",
    senderAddress: '0xa5F8A22D2ee33281ca772f0eB18C04A32314bf6B',
    recipientAddress: '0xa5F8A22D2ee33281ca772f0eB18C04A32314bf6B',
    amount: '0.001', // Small amount for testing
    // Test usernames - replace with actual usernames that exist in your system
    fromUsername: 'harshalmadnani',
    toUsername: 'mentigent'
};

async function runTests() {
    try {
        // Test 1: Simple ETH transfer with addresses
        console.log('\nTest 1: Testing simple ETH transfer with addresses...');
        const simpleTransferResult = await transferEthToAddress(
            config.recipientAddress,
            config.amount,
            config.senderAddress,
            config.apiKey,
            config.baseUrl
        );
        console.log('Simple transfer result:', JSON.stringify(simpleTransferResult, null, 2));

        // Test 2: Username-based transfer
        console.log('\nTest 2: Testing transfer with usernames...');
        console.log(`Starting transfer from ${config.fromUsername} to ${config.toUsername} for ${config.amount} ETH`);
        const usernameTransferResult = await transferWithUsernames(
            config.fromUsername,
            config.toUsername,
            config.amount
        );
        console.log('Username transfer result:', JSON.stringify(usernameTransferResult, null, 2));

    } catch (error) {
        console.error('Test failed:', error.message);
        throw error;
    }
}

// Run the tests
if (require.main === module) {
    console.log('Starting transfer tests...');
    console.log('Please make sure to update the config with your actual values before running!');
    
    runTests()
        .then(() => {
            console.log('\nAll tests completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\nTests failed:', error);
            process.exit(1);
        });
}

module.exports = runTests; 