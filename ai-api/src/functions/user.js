const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Get Supabase configuration from environment variables
const SUPABASE_URL = "https://wbsnlpviggcnwqfyfobh.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic25scHZpZ2djbndxZnlmb2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODc2NTcwNiwiZXhwIjoyMDU0MzQxNzA2fQ.tr6PqbiAXQYSQSpG2wS6I4DZfV1Gc3dLXYhKwBrJLS0";

// MultiBaas API configuration
const MULTIBAAS_API_URL = "https://sfhqqxqwkfaslnwm5ktynkxgja.multibaas.com";
const MULTIBAAS_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzQzODM2NzE0LCJqdGkiOiJmZGViZTIwYS0xZGVmLTRiYWEtODYyZS00MWJmZWZmZjcxM2YifQ.cpG1R5Uyzoy6bL2-ijwV8HQOKk12JW9X4fuRr07qc7Q";
// API key specific to the hev7x32zafgjtetf3b3t556i5m.multibaas.com endpoint
const MULTIBAAS_HEV_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzQzODM4MTg4LCJqdGkiOiI3Mzg0ZTk5OS04MDQxLTQ3OTItYmE2Ny0yMTBjYjU3NTdmNGIifQ.t3TATnZk_IyI4RB-8exY42PD8JWQfKaf9JueTde5xTA";
const MULTIBAAS_CLIENT_ID = "a863dd16-67cd-4460-bab3-225d8d9a6626";
const MULTIBAAS_VAULT_NAME = "ethglobal-taipei-5";

// Create a new HSM key in MultiBaas
const createHsmKey = async (keyName) => {
  try {
    const response = await axios.post(
      `${MULTIBAAS_API_URL}/api/v0/hsm/key/new`,
      {
        clientID: MULTIBAAS_CLIENT_ID,
        keyName: keyName,
        vaultName: MULTIBAAS_VAULT_NAME,
        useHardwareModule: false
      },
      {
        headers: {
          'Authorization': `Bearer ${MULTIBAAS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error creating HSM key:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// Create a user with username in the users2 table
const createUserWithUsername = async (username, userData = {}) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase credentials not configured');
    }
    
    if (!username || typeof username !== 'string' || username.trim() === '') {
      throw new Error('Valid username is required');
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const { data: existingUser, error: checkError } = await supabase
      .from('users2')
      .select('username')
      .eq('username', username)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Error checking username: ${checkError.message}`);
    }
    
    if (existingUser) {
      return {
        success: false,
        error: 'Username already exists'
      };
    }
    
    // First create the user record
    const userRecord = {
      username,
      created_at: new Date().toISOString(),
      ...userData
    };
    
    const { data, error } = await supabase
      .from('users2')
      .insert([userRecord])
      .select();
    
    if (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
    
    // After user is created, use the user's ID as the key name for HSM key
    const userId = data[0].id;
    const formattedUsername = `user${userId}`; // Using the same format for username
    const keyName = formattedUsername; // Using alphanumeric name format
    
    // Update the username to match the HSM key format
    const { data: usernameUpdateData, error: usernameUpdateError } = await supabase
      .from('users2')
      .update({ username: formattedUsername })
      .eq('id', userId)
      .select();
    
    if (usernameUpdateError) {
      console.error(`Error updating username: ${usernameUpdateError.message}`);
      // Continue despite error in updating username
    } else {
      console.log(`Successfully updated username to ${formattedUsername}`);
      // Use the updated user data
      data[0] = usernameUpdateData[0];
    }
    
    // Create an HSM key for the user using ID as key name
    console.log(`Creating HSM key with name: ${keyName} for user: ${formattedUsername}`);
    const hsmKeyResult = await createHsmKey(keyName);
    
    if (!hsmKeyResult.success) {
      console.error(`Failed to create HSM key for user ${formattedUsername}:`, hsmKeyResult.error);
      // We already created the user, so return successful user creation despite HSM failure
      return {
        success: true,
        data: data[0],
        hsm_key_result: hsmKeyResult
      };
    }
    
    console.log(`Successfully created HSM key for user ${formattedUsername}`);
    
    // Add the created HSM key using addHsmKey
    if (hsmKeyResult.data && 
        hsmKeyResult.data.result && 
        hsmKeyResult.data.result.keyName && 
        hsmKeyResult.data.result.keyVersion) {
      
      const { keyName, keyVersion } = hsmKeyResult.data.result;
      console.log(`Adding HSM key to system with keyName: ${keyName}, keyVersion: ${keyVersion}`);
      
      const addKeyResult = await addHsmKey(keyName, keyVersion);
      if (!addKeyResult.success) {
        console.error(`Failed to add HSM key: ${addKeyResult.error}`);
      } else {
        console.log(`Successfully added HSM key to system`);
        // Add the addKeyResult to hsmKeyResult for complete tracking
        hsmKeyResult.addKeyResult = addKeyResult;
      }
    }
    
    // Update the user record with address and HSM key data if available
    let updatedData = data[0];
    
    if (hsmKeyResult.data) {
      const updateFields = { hsm_key_data: hsmKeyResult.data };
      
      // If publicAddress is available in HSM response, use it
      if (hsmKeyResult.data.result && hsmKeyResult.data.result.publicAddress) {
        const publicAddress = hsmKeyResult.data.result.publicAddress;
        console.log(`Updating user with address: ${publicAddress}`);
        updateFields.address = publicAddress;
      }
      
      const { data: updateData, error: updateError } = await supabase
        .from('users2')
        .update(updateFields)
        .eq('id', userId)
        .select();
      
      if (updateError) {
        console.error(`Error updating user with HSM data: ${updateError.message}`);
      } else {
        updatedData = updateData[0];
        console.log(`Successfully updated user with HSM data`);
      }
    }
    
    return {
      success: true,
      data: updatedData,
      hsm_key_result: hsmKeyResult
    };
  } catch (error) {
    console.error('Error in createUserWithUsername:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get user by username from the users2 table
const getUserByUsername = async (username) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase credentials not configured');
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const { data, error } = await supabase
      .from('users2')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'User not found'
        };
      }
      throw new Error(`Error getting user: ${error.message}`);
    }
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error in getUserByUsername:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Add an existing HSM key to MultiBaas
const addHsmKey = async (keyName, keyVersion) => {
  try {
    console.log(`Adding HSM key: ${keyName} with version: ${keyVersion}`);
    
    // Log the request details that will be sent
    const url = 'https://hev7x32zafgjtetf3b3t556i5m.multibaas.com/api/v0/hsm/key';
    const requestData = {
      clientID: MULTIBAAS_CLIENT_ID,
      keyName: keyName,
      vaultName: MULTIBAAS_VAULT_NAME,
      keyVersion: keyVersion
    };
    
    // Use the exact token that worked with curl directly
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzQzODM4MTg4LCJqdGkiOiI3Mzg0ZTk5OS04MDQxLTQ3OTItYmE2Ny0yMTBjYjU3NTdmNGIifQ.t3TATnZk_IyI4RB-8exY42PD8JWQfKaf9JueTde5xTA";
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('URL:', url);
    console.log('Request data:', JSON.stringify(requestData));
    console.log('Headers:', JSON.stringify(headers));
    
    const response = await axios.post(url, requestData, { headers });
    
    console.log(`Successfully added HSM key ${keyName}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error(`Error adding HSM key ${keyName}:`, error.response?.data || error.message);
    // More detailed error logging
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    console.error('Error config:', error.config);
    
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// Get address from username
const getAddressFromUsername = async (username) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase credentials not configured');
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const { data, error } = await supabase
      .from('users2')
      .select('address')
      .eq('username', username)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'User not found'
        };
      }
      throw new Error(`Error getting user address: ${error.message}`);
    }
    
    if (!data.address) {
      return {
        success: false,
        error: 'Address not found for this user'
      };
    }
    
    return {
      success: true,
      address: data.address
    };
  } catch (error) {
    console.error('Error in getAddressFromUsername:', error);
    return {
      success: false,
      error: error.message
    };
  }
};


const createUser = async (username, userData = {}) => {
  try {
    console.log(`Starting createUser process for username: ${username}`);
    
    // Step 1: Create user with username
    console.log('Step 1: Creating user with username');
    const userResult = await createUserWithUsername(username, userData);
    
    if (!userResult.success) {
      throw new Error(`Failed to create user: ${userResult.error}`);
    }
    
    console.log('User created successfully, waiting 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    // Step 2: Create HSM key using the formatted username
    const userId = userResult.data.id;
    const formattedUsername = userResult.data.username;
    const keyName = formattedUsername;
    
    console.log(`Step 2: Creating HSM key for user: ${formattedUsername}`);
    const hsmKeyResult = await createHsmKey(keyName);
    
    if (!hsmKeyResult.success) {
      throw new Error(`Failed to create HSM key: ${hsmKeyResult.error}`);
    }
    
    console.log('HSM key created successfully, waiting 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    // Step 3: Add HSM key to the system
    if (hsmKeyResult.data && 
        hsmKeyResult.data.result && 
        hsmKeyResult.data.result.keyName && 
        hsmKeyResult.data.result.keyVersion) {
      
      const { keyName, keyVersion } = hsmKeyResult.data.result;
      console.log(`Step 3: Adding HSM key to system with keyName: ${keyName}, keyVersion: ${keyVersion}`);
      
      const addKeyResult = await addHsmKey(keyName, keyVersion);
      if (!addKeyResult.success) {
        throw new Error(`Failed to add HSM key: ${addKeyResult.error}`);
      }
      
      console.log('HSM key added successfully');
      
      // Update the user record with address and HSM key data
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      
      const updateFields = { 
        hsm_key_data: hsmKeyResult.data,
        key_added: true
      };
      
      // If publicAddress is available in HSM response, use it
      if (hsmKeyResult.data.result && hsmKeyResult.data.result.publicAddress) {
        const publicAddress = hsmKeyResult.data.result.publicAddress;
        console.log(`Updating user with address: ${publicAddress}`);
        updateFields.address = publicAddress;
      }
      
      const { data: updateData, error: updateError } = await supabase
        .from('users2')
        .update(updateFields)
        .eq('id', userId)
        .select();
      
      if (updateError) {
        console.error(`Error updating user with HSM data: ${updateError.message}`);
      } else {
        console.log(`Successfully updated user with HSM data and key_added status`);
      }
      
      return {
        success: true,
        data: updateData?.[0] || userResult.data,
        hsmKeyResult,
        addKeyResult
      };
    } else {
      throw new Error('Invalid HSM key data received');
    }
    
  } catch (error) {
    console.error('Error in createUser:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const getOrCreateUserAddress = async (username) => {
  try {
    console.log(`Checking if user exists: ${username}`);
    
    // Check if the user exists at all first
    const userResult = await getUserByUsername(username);
    const userExists = userResult.success;
    
    // Then check if we have an address for the user
    const addressResult = await getAddressFromUsername(username);
    
    // If user exists and has an address, return the address
    if (addressResult.success) {
      console.log(`User ${username} already exists with address: ${addressResult.address}`);
      return addressResult;
    }
    
    // If user exists but doesn't have an address, don't try to create again
    if (userExists) {
      console.log(`User ${username} exists but doesn't have an address yet.`);
      return {
        success: false,
        error: 'User exists but does not have an address yet'
      };
    }
    
    console.log(`User ${username} does not exist, creating new user...`);
    
    // Create user if not exists
    const createResult = await createUser(username);
    
    if (!createResult.success) {
      throw new Error(`Failed to create user: ${createResult.error}`);
    }
    
    // Get the actual username that was created (might have been reformatted)
    const createdUsername = createResult.data.username;
    console.log(`User created successfully with assigned username: ${createdUsername}`);
    console.log(`Waiting 5 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    // Use the created username to get the address
    console.log(`Getting address for newly created user: ${createdUsername}`);
    const newAddressResult = await getAddressFromUsername(createdUsername);
    
    if (!newAddressResult.success) {
      // If we can't get the address but we know the user was created with an address,
      // let's return that address from the create result
      if (createResult.data && createResult.data.address) {
        console.log(`Using address from create response: ${createResult.data.address}`);
        return {
          success: true,
          address: createResult.data.address
        };
      }
      
      throw new Error(`Failed to get address for newly created user: ${newAddressResult.error}`);
    }
    
    return newAddressResult;
  } catch (error) {
    console.error('Error in getOrCreateUserAddress:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  createUserWithUsername,
  getUserByUsername,
  createHsmKey,
  addHsmKey,
  getAddressFromUsername,
  createUser,
  getOrCreateUserAddress
};
