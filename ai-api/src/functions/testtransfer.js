const { transfer, transferWithUsernames } = require('./transfer');

async function testTransfer() {
    try {
        // Test Case 1: Valid transfer
        console.log("Testing valid transfer...");
        const result = await transfer(
            "0xa5F8A22D2ee33281ca772f0eB18C04A32314bf6B", // to address
            "1000",  // amount in wei
            "0xa5F8A22D2ee33281ca772f0eB18C04A32314bf6B"  // from address
        );
        console.log("Transfer successful:", result);

        // Test Case 2: Invalid address format
        console.log("\nTesting invalid address format...");
        try {
            await transfer(
                "invalid-address",
                "1000",
                "0xa5F8A22D2ee33281ca772f0eB18C04A32314bf6B"
            );
        } catch (error) {
            console.log("Expected error caught:", error.message);
        }

        // Test Case 3: Zero amount transfer
        console.log("\nTesting zero amount transfer...");
        try {
            const result = await transfer(
                "0xa5F8A22D2ee33281ca772f0eB18C04A32314bf6B",
                "0",
                "0xa5F8A22D2ee33281ca772f0eB18C04A32314bf6B"
            );
            console.log("Transfer successful:", result);
        } catch (error) {
            console.log("Error:", error.message);
        }

        // Test Case 4: Valid transfer with usernames
        console.log("\nTesting transfer with usernames...");
        try {
            const result = await transferWithUsernames(
                "sender_username",  // from username
                "receiver_username", // to username
                "1000"  // amount
            );
            console.log("Transfer with usernames successful:", result);
        } catch (error) {
            console.log("Error in transfer with usernames:", error.message);
        }

        // Test Case 5: Invalid username transfer
        console.log("\nTesting transfer with invalid usernames...");
        try {
            await transferWithUsernames(
                "nonexistent_sender",
                "nonexistent_receiver",
                "1000"
            );
        } catch (error) {
            console.log("Expected error caught:", error.message);
        }

    } catch (error) {
        console.error("Test failed:", error.message);
    }
}

// Run the tests
testTransfer().then(() => {
    console.log("\nAll tests completed");
}).catch((error) => {
    console.error("Test suite failed:", error.message);
});
