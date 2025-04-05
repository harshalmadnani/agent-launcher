const axios = require('axios');

async function transfer(toAddress, amount, fromAddress) {
    try {
        // Validate addresses
        if (!toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            throw new Error('Invalid recipient address format');
        }
        if (!fromAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            throw new Error('Invalid sender address format');
        }

        const response = await axios({
            method: 'post',
            url: `https://sfhqqxqwkfaslnwm5ktynkxgja.multibaas.com/api/v0/chains/ethereum/transfers`,
            headers: {
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzQzODM2NzE0LCJqdGkiOiJmZGViZTIwYS0xZGVmLTRiYWEtODYyZS00MWJmZWZmZjcxM2YifQ.cpG1R5Uyzoy6bL2-ijwV8HQOKk12JW9X4fuRr07qc7Q`,
                'Content-Type': 'application/json'
            },
            data: {
                from: fromAddress,
                to: toAddress,
                value: amount,
                signAndSubmit: true,
                nonceManagement: false,
                preEIP1559: false,
                signer: fromAddress,
                formatInts: "auto",
                contractOverride: true
            }
        });

        return response.data;
    } catch (error) {
        throw new Error(`ETH transfer failed: ${error.message}`);
    }
}



async function transferWithUsernames(fromUsername, toUsername, amount) {
    try {
        // Get from address
        const fromResponse = await axios.get(`https://agent-launcher.onrender.com/user?username=${fromUsername}`);
        if (!fromResponse.data.success || !fromResponse.data.address) {
            throw new Error(`Could not resolve address for sender username: ${fromUsername}`);
        }
        const fromAddress = fromResponse.data.address;

        // Get to address
        const toResponse = await axios.get(`https://agent-launcher.onrender.com/user?username=${toUsername}`);
        if (!toResponse.data.success || !toResponse.data.address) {
            throw new Error(`Could not resolve address for recipient username: ${toUsername}`);
        }
        const toAddress = toResponse.data.address;

        // Call the existing transfer function with hardcoded values
        return await transfer({
            fromAddress,
            toAddress,
            amount,
        });
    } catch (error) {
        throw new Error(`Transfer failed: ${error.message}`);
    }
}

module.exports = {
    transfer,
    transferWithUsernames
};
