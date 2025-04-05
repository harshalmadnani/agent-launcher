const axios = require('axios');

async function transferEthToAddress(toAddress, amount, fromAddress, apiKey, baseUrl) {
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
            url: `${baseUrl}/api/v0/chains/ethereum/txm/transfer`,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            data: {
                from: fromAddress,
                to: toAddress,
                value: amount
            }
        });

        return response.data;
    } catch (error) {
        throw new Error(`ETH transfer failed: ${error.message}`);
    }
}

async function transfer({
    fromAddress,
    toAddress,
    amount,
    apiKey,
    baseUrl,
    options = {}
}) {
    try {
        // Validate addresses
        if (!toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            throw new Error('Invalid recipient address format');
        }
        if (!fromAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            throw new Error('Invalid sender address format');
        }

        const payload = {
            from: fromAddress,
            to: toAddress,
            value: amount,
            ...options
        };

        const response = await axios({
            method: 'post',
            url: `${baseUrl}/eth/transfer`,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            data: payload
        });

        return response.data;
    } catch (error) {
        throw new Error(`CurveGrid ETH transfer failed: ${error.message}`);
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

        // Call the existing transfer function
        return await transfer({
            fromAddress,
            toAddress,
            amount,
            apiKey: process.env.API_KEY,
            baseUrl: process.env.BASE_URL
        });
    } catch (error) {
        throw new Error(`Transfer failed: ${error.message}`);
    }
}

module.exports = {
    transferEthToAddress,
    transfer,
    transferWithUsernames
};
