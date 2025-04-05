const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Scraper} = require('twitter-agent');
const fs = require('fs');
require('dotenv').config();
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

// Add CORS middleware

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
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
// Function to create a user with their Twitter username
const createUserWithTwitterUsername = async (username) => {
  try {
    console.log(`Creating new user for Twitter username: ${username}`);
    
    // First try calling the Agent Launcher API
    try {
      const response = await axios.post(
        'https://agent-launcher.onrender.com/api/users',
        {
          username: username,
          source: 'twitter'
        }
      );
      
      if (response.data.success) {
        console.log(`Successfully created user for Twitter username: ${username} via API`);
        return {
          success: true,
          data: response.data.data
        };
      }
    } catch (apiError) {
      console.log(`API call failed: ${apiError.message}. Falling back to direct database creation.`);
      // Continue to fallback method
    }
    
    // Fallback: Create user directly in Supabase
    console.log(`Creating user directly in database for: ${username}`);
    
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users2')
      .select('username')
      .eq('username', username)
      .single();
    
    if (!checkError && existingUser) {
      console.log(`User ${username} already exists in the database`);
      return {
        success: false,
        error: 'Username already exists'
      };
    }
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error(`Error checking if user exists: ${checkError.message}`);
    }
    
    // Create user record
    const userRecord = {
      username: username,
      created_at: new Date().toISOString(),
      source: 'twitter'
    };
    
    const { data, error } = await supabase
      .from('users2')
      .insert([userRecord])
      .select();
    
    if (error) {
      throw new Error(`Error creating user record: ${error.message}`);
    }
    
    console.log(`Successfully created basic user record for: ${username}`);
    
    // We don't have HSM key creation capability here, so return success with the data we have
    return {
      success: true,
      data: data[0],
      note: 'User created without wallet'
    };
    
  } catch (error) {
    console.error(`Error creating user for Twitter username ${username}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

const getAddressFromUsername = async (username) => {
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('users2')
      .select('address')
      .eq('username', username)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`User not found: ${username}. Attempting to create user...`);
        
        // Try to create a new user with this username using the standard function
        const createResult = await createUserWithUsername(username, { source: 'twitter' });
        
        if (!createResult.success) {
          console.error(`Failed to create user for ${username}:`, createResult.error);
          return {
            success: false,
            error: 'User not found and could not be created'
          };
        }
        
        // Return the address from the newly created user
        if (createResult.data && createResult.data.address) {
          console.log(`Created new user with address: ${createResult.data.address}`);
          return {
            success: true,
            address: createResult.data.address,
            isNewUser: true
          };
        } else {
          return {
            success: false,
            error: 'User created but address not available'
          };
        }
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

// Function to fetch Twitter credentials
async function getTwitterCredentials(agentId) {
  const { data, error } = await supabase
    .from('agents2')
    .select('twitter_credentials, cookies')
    .eq('id', agentId)
    .single();

  if (error) {
    console.error('Error fetching Twitter credentials:', error);
    return null;
  }
  
  let credentials = {};
  
  // Parse twitter_credentials
  if (data?.twitter_credentials) {
    try {
      // Handle the new JSON format
      const rawCredentials = typeof data.twitter_credentials === 'string' 
        ? JSON.parse(data.twitter_credentials)
        : data.twitter_credentials;

      // Map the credentials to the expected format
      credentials = {
        username: rawCredentials['TWITTER_USERNAME='] || rawCredentials['TWITTER_USERNAME'],
        password: rawCredentials['TWITTER_PASSWORD='] || rawCredentials['TWITTER_PASSWORD'],
        email: rawCredentials['TWITTER_EMAIL='] || rawCredentials['TWITTER_EMAIL'],
        twoFactorSecret: rawCredentials['TWITTER_2FA_SECRET='] || rawCredentials['TWITTER_2FA_SECRET']
      };
    } catch (parseError) {
      console.error('Error parsing Twitter credentials:', parseError);
    }
  }
  
  // Add cookies from the separate column
  if (data?.cookies) {
    // Since cookies is now JSONB, it's already parsed as a JavaScript object
    credentials.cookies = data.cookies;
    console.log('Retrieved cookies from JSONB field:', 
      Array.isArray(credentials.cookies) ? 
        `${credentials.cookies.length} cookies` : 
        `cookies in ${typeof credentials.cookies} format`);
  }
  
  // Add agent_id
  credentials.agent_id = agentId;
  
  // Log what we have
  console.log('Retrieved credentials for agent', agentId, {
    hasUsername: !!credentials.username,
    hasPassword: !!credentials.password,
    hasEmail: !!credentials.email,
    hasTwoFactorSecret: !!credentials.twoFactorSecret,
    hasCookies: !!(credentials.cookies && credentials.cookies.length > 0)
  });
  
  if (!credentials.username || !credentials.password) {
    console.log('Missing required Twitter credentials for agent:', agentId);
    return null;
  }
  
  return credentials;
}

// Function to post tweet using twitter-agent with cookie-based authentication
async function postTweet(twitterCredentials, tweetContent) {
  let scraper = null;
  
  try {
    if (!twitterCredentials) {
      console.error('Twitter credentials are missing');
      return false;
    }

    const { username, password, email, twoFactorSecret, cookies, agent_id } = twitterCredentials;
    
    // Log credentials for debugging (remove sensitive info in production)
    console.log('Twitter credentials:', {
      username: username ? 'provided' : 'missing',
      password: password ? 'provided' : 'missing',
      email: email ? 'provided' : 'missing',
      twoFactorSecret: twoFactorSecret ? 'provided' : 'missing',
      cookies: cookies ? `${typeof cookies === 'string' ? 'text format' : Array.isArray(cookies) ? cookies.length + ' cookies' : 'unknown format'}` : 'no cookies',
      agent_id: agent_id || 'missing'
    });

    scraper = await setupScraper(twitterCredentials);
    
    // Split content into thread if it contains blank lines
    const tweets = tweetContent.split('\n\n').filter(tweet => tweet.trim());
    
    if (tweets.length > 1) {
      console.log(`Creating thread with ${tweets.length} tweets`);
      await createThread(scraper, tweets);
    } else {
      // Single tweet case
      console.log('Sending single tweet with content:', tweets[0]);
      await scraper.sendTweet(tweets[0]);
    }

    // Close browser after tweet is sent
    if (scraper?.close) {
      await scraper.close();
    }

    console.log('Tweet(s) posted successfully!');
    return true;

  } catch (error) {
    console.error('Error posting tweet:', error);
    
    // Try to close the scraper if it exists
    try {
      if (scraper) {
        if (typeof scraper.close === 'function') {
          await scraper.close();
          console.log('Closed scraper successfully');
        } else if (scraper.browser && typeof scraper.browser.close === 'function') {
          await scraper.browser.close();
          console.log('Closed browser directly');
        } else {
          console.log('No close method found on scraper or browser');
        }
      }
    } catch (closeError) {
      console.error('Error closing browser after tweet failure:', closeError);
    }
    
    return false;
  }
}

// Add createThread function
async function createThread(scraper, threadContent, options = {}) {
  const { delayBetweenTweets = 3000, indexingDelay = 10000 } = options;
  let previousTweetId = null;

  for (let i = 0; i < threadContent.length; i++) {
    const tweetText = threadContent[i];
    const tweetResult = await scraper.sendTweet(
      tweetText,
      i === 0 ? null : previousTweetId,
    );

    try {
      await new Promise((resolve) => setTimeout(resolve, indexingDelay));

      if (tweetResult?.id) {
        previousTweetId = tweetResult.id;
      } else {
        const username = await scraper
          .me()
          .then((profile) => profile?.username);
        if (!username) {
          throw new Error('Failed to get username');
        }
        const recentTweets = scraper.getTweetsAndReplies(username, 5);
        for await (const tweet of recentTweets) {
          if (tweet.text.includes(tweetText.substring(0, 30))) {
            previousTweetId = tweet.id;
            break;
          }
        }
      }

      if (!previousTweetId) {
        throw new Error(`Failed to verify tweet #${i + 1}`);
      }

      if (i < threadContent.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenTweets));
      }
    } catch (error) {
      throw new Error(`Failed to post tweet #${i + 1}: ${error.message}`);
    }
  }

  return previousTweetId;
}

// Function to update Twitter credentials with new cookies
async function updateTwitterCredentials(agentId, cookieStrings) {
  try {
    if (!agentId) {
      console.error('Cannot update Twitter credentials: Missing agent_id');
      return;
    }
    
    // Save cookies to the cookies column - with JSONB, we can store the array directly
    const { error: updateError } = await supabase
      .from('agents2')
      .update({ cookies: cookieStrings })
      .eq('id', agentId);
    
    if (updateError) {
      console.error('Error updating cookies:', updateError);
    } else {
      console.log('Cookies updated successfully for agent:', agentId);
    }
  } catch (error) {
    console.error('Error in updateTwitterCredentials:', error);
  }
}

// Function to get latest tweets for a user
async function getLatestTweets(scraper, username, count = 10, includeRetweets = false) {
  const tweets = [];
  try {
    const timeline = scraper.getTweets(username, count);
    
    for await (const tweet of timeline) {
      // Skip retweets and quote tweets
      if (!includeRetweets && (tweet.isRetweet || tweet.isQuoted)) {
        continue;
      }
      tweets.push(tweet);
      if (tweets.length >= count) {
        break;
      }
    }
    
    console.log(`Retrieved ${tweets.length} original tweets from @${username}`);
    return tweets;
  } catch (error) {
    console.error(`Error fetching tweets for @${username}:`, error);
    return [];
  }
}

// Update getTargetUserTweets to remove Spaces logic
async function getTargetUserTweets(agentId) {
  try {
    // Fetch agent configuration including post_configuration
    const { data: agentData, error: agentError } = await supabase
      .from('agents2')
      .select('chat_configuration, post_configuration')
      .eq('id', agentId)
      .single();

    if (agentError) throw agentError;

    let chatConfig, postConfig;
    try {
      chatConfig = typeof agentData.chat_configuration === 'string' 
        ? JSON.parse(agentData.chat_configuration)
        : agentData.chat_configuration;
      
      postConfig = typeof agentData.post_configuration === 'string'
        ? JSON.parse(agentData.post_configuration)
        : agentData.post_configuration;
    } catch (parseError) {
      console.error('Error parsing configuration:', parseError);
      return [];
    }

    if (!chatConfig?.reply_to_usernames?.length) {
      console.log('No target usernames found in configuration');
      return [];
    }

    // Get interval from post_configuration (default to 30 minutes if not specified)
    const intervalMinutes = postConfig?.interval || 30;
    console.log(`Using interval of ${intervalMinutes} minutes`);

    // Get Twitter credentials and set up scraper
    const credentials = await getTwitterCredentials(agentId);
    if (!credentials) {
      throw new Error('Failed to get Twitter credentials');
    }

    const scraper = await setupScraper(credentials);
    
    try {
      const allTweets = [];
      const cutoffTime = new Date(Date.now() - intervalMinutes * 60 * 1000);
      
      for (const username of chatConfig.reply_to_usernames) {
        // Get tweets
        const userTweets = await getLatestTweets(scraper, username);
        
        // Filter tweets by interval
        const recentTweets = userTweets.filter(tweet => {
          return tweet.timeParsed && tweet.timeParsed > cutoffTime;
        });
        
        allTweets.push(...recentTweets);
      }

      // Close the scraper after we're done
      if (scraper?.close) {
        await scraper.close();
      }

      console.log(`Found ${allTweets.length} tweets within the last ${intervalMinutes} minutes`);
      return allTweets;
    } catch (error) {
      throw error;
    } finally {
      // Ensure scraper is closed even if there's an error
      if (scraper?.close) {
        await scraper.close();
      }
    }
  } catch (error) {
    console.error('Error in getTargetUserTweets:', error);
    return [];
  }
}

// Function to get AI analysis for a tweet
async function getAIAnalysis(tweetText, address = null) {
  try {
    // Check if this is a new user from the tweet text
    const isNewUser = tweetText.includes('[NEW USER]');
    // Remove the tag from the tweet text
    const cleanTweetText = tweetText.replace('[NEW USER]', '').trim();
    
    const response = await fetch('https://agent-launcher.onrender.com/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: cleanTweetText,
        address: address,
        isNewUser: isNewUser,
        systemPrompt: "You are a helpful AI assistant. Analyze the tweet and provide a natural, engaging response. Keep responses concise and friendly. Don't use hashtags or emojis unless they were in the original tweet, dont mention any data errors and keep it under 200 characters.You are a twitter reply guy" + (isNewUser ? " If this is a new user, welcome them to the service and briefly mention their new wallet was created." : "")
      })
    });

    if (!response.ok) {
      throw new Error('API request failed with status: ' + response.status);
    }

    const data = await response.json();
    
    // Handle error responses
    if (data.error) {
      console.error('AI analysis error:', data.error);
      return null;
    }
    
    // Extract the analysis, handling various response formats
    let analysis = null;
    if (data.data?.analysis) {
      analysis = data.data.analysis;
    } else if (data.result?.description) {
      analysis = data.result.description;
    } else if (typeof data.data === 'string') {
      analysis = data.data;
    } else if (typeof data.result === 'string') {
      analysis = data.result;
    }

    // Remove any text between <think> tags
    if (analysis) {
      analysis = analysis.replace(/<think>.*?<\/think>/gs, '');
    }

    // Validate the analysis
    if (!analysis || typeof analysis !== 'string') {
      console.error('Invalid AI analysis response:', data);
      return null;
    }

    return analysis;
  } catch (error) {
    console.error('Error getting AI analysis:', error);
    return null;
  }
}

// Update the generateMentionReply function to use AI analysis
async function generateMentionReply(tweet) {
  try {
    // Get the user's address from their username
    const addressResult = await getAddressFromUsername(tweet.username);
    const userAddress = addressResult.success ? addressResult.address : null;
    const isNewUser = addressResult.isNewUser || false;
    
    if (userAddress) {
      console.log(`Found address for @${tweet.username}: ${userAddress}`);
      if (isNewUser) {
        console.log(`This is a newly created user!`);
      }
    } else {
      console.log(`No address found for @${tweet.username}`);
    }
    
    // Include additional context for AI when this is a new user
    let tweetContext = tweet.text || '';
    if (isNewUser) {
      tweetContext = `[NEW USER] ${tweetContext}`;
    }
    
    // Even if we don't have a user address, still analyze the tweet content
    const analysis = await getAIAnalysis(tweetContext, userAddress);
    
    if (analysis) {
      // Ensure the reply starts with the username mention
      if (!analysis.startsWith(`@${tweet.username}`)) {
        return `@${tweet.username} ${analysis}`;
      }
      return analysis;
    }
    
    // Fallback to default responses if AI analysis fails
    let replyText = `@${tweet.username} `;
    const tweetText = tweet.text?.toLowerCase() || '';
    
    if (isNewUser) {
      replyText += "Welcome! I've created a wallet for you. ";
    } else if (!userAddress && addressResult.error && addressResult.error.includes('not found')) {
      // Don't mention the wallet creation if it failed, just respond normally
      console.log('User creation failed, responding without wallet reference');
    }
    
    if (tweetText.includes('help') || tweetText.includes('how')) {
      replyText += "I'll be happy to help! Please provide more details.";
    } else if (tweetText.includes('thanks') || tweetText.includes('thank you')) {
      replyText += "You're welcome! Let me know if you need anything else.";
    } else if (tweetText.includes('question')) {
      replyText += "I'll do my best to answer your question. What would you like to know?";
    } else {
      replyText += "Thanks for reaching out! I appreciate your message.";
    }
    
    return replyText;
  } catch (error) {
    console.error('Error generating reply:', error);
    return `@${tweet.username} Thanks for reaching out!`;
  }
}

// Rate limiter helper
const rateLimiter = {
  lastRequest: 0,
  minDelay: 2000, // 2 seconds minimum between requests
  
  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minDelay - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
  }
};

// Function to reply to mentions
async function replyToMentions(scraper, credentials, maxMentions = 10, delayMs = 2000, intervalMinutes = 30) {
  try {
    const myUsername = credentials.username;
    console.log('=== Starting replyToMentions ===');
    console.log(`Bot username: @${myUsername}`);
    console.log(`Max mentions to process: ${maxMentions}`);
    console.log(`Delay between replies: ${delayMs}ms`);
    console.log(`Looking back: ${intervalMinutes} minutes`);
    console.log(`Will attempt to get wallet addresses for users`);

    if (!myUsername) {
      console.error('ERROR: No username found in credentials:', credentials);
      throw new Error('Could not determine logged-in username');
    }

    const mentions = [];
    const now = Date.now();
    const query = `@${myUsername}`;
    
    console.log(`\n🔍 Searching for mentions using query: "${query}"`);
    
    // Search for recent mentions with more debug logging
    let skippedCount = { old: 0, self: 0, replied: 0, spam: 0 };
    let rawTweetCount = 0;
    
    try {
      // Use searchTweets with maxMentions parameter and searchMode 1 (Latest)
      for await (const tweet of scraper.searchTweets(query, maxMentions, 1)) {
        rawTweetCount++;
        console.log(`\n[DEBUG] Raw tweet ${rawTweetCount}:`, {
          id: tweet.id,
          username: tweet.username,
          text: tweet.text?.substring(0, 50),
          isReply: tweet.isReply,
          inReplyToStatusId: tweet.inReplyToStatusId,
          timeParsed: tweet.timeParsed
        });
        
        // Skip own tweets
        if (tweet.username === myUsername) {
          skippedCount.self++;
          console.log('  🤖 Skipped: Own tweet');
          continue;
        }

        // Skip tweets older than intervalMinutes
        if (tweet.timeParsed && 
            (now - tweet.timeParsed.getTime()) > (intervalMinutes * 60 * 1000)) {
          skippedCount.old++;
          console.log('  ⏰ Skipped: Tweet too old');
          continue;
        }
        
        // Basic spam check
        if (tweet.text?.toLowerCase().includes('win free') || 
            tweet.text?.toLowerCase().includes('click here')) {
          skippedCount.spam++;
          console.log('  🚫 Skipped: Potential spam');
          continue;
        }
        
        console.log('  ✅ Tweet accepted for reply');
        mentions.push(tweet);
      }
    } catch (searchError) {
      console.error('\n❌ Error during tweet search:', searchError);
    }

    console.log('\n=== Search Results ===');
    console.log(`Total tweets found: ${rawTweetCount}`);
    console.log(`Found ${mentions.length} valid mentions to reply to`);
    console.log('Skipped tweets:', skippedCount);

    // Reply to each valid mention
    console.log('\n=== Starting Replies ===');
    for (const tweet of mentions) {
      if (!tweet.id) {
        console.log('⚠️ Skipping tweet with no ID');
        continue;
      }

      try {
        console.log(`\n📝 Processing reply to @${tweet.username}`);
        console.log(`Original tweet: "${tweet.text?.substring(0, 100)}..."`);
        console.log(`Looking up user's wallet address...`);
        
        await rateLimiter.wait();
        console.log('Rate limit respected');
        
        const customReplyText = await generateMentionReply(tweet);
        console.log(`Generated reply: "${customReplyText}"`);
        
        // Use sendTweet instead of tweet
        await scraper.sendTweet(customReplyText, tweet.id);
        console.log('✨ Reply sent successfully');
        
        if (mentions.indexOf(tweet) < mentions.length - 1) {
          console.log(`⏳ Waiting ${delayMs}ms before next reply...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`❌ Error replying to tweet ${tweet.id}:`, error);
        continue;
      }
    }
    
    console.log('\n=== Finished Processing Mentions ===');
    console.log(`Successfully processed ${mentions.length} mentions`);
    
  } catch (error) {
    console.error('\n❌ Fatal error in replyToMentions:', error);
  }
}

// Function to handle replies to your tweets
async function handleTweetReplies(scraper, credentials, maxTweets = 20, delayMs = 2000, intervalMinutes = 30) {
  try {
    const myUsername = credentials.username;
    console.log('=== Starting handleTweetReplies ===');
    console.log(`Bot username: @${myUsername}`);
    console.log(`Max tweets to check: ${maxTweets}`);
    console.log(`Delay between replies: ${delayMs}ms`);
    console.log(`Looking back: ${intervalMinutes} minutes`);

    if (!myUsername) {
      console.error('ERROR: No username found in credentials:', credentials);
      throw new Error('Could not determine logged-in username');
    }

    // Get your recent tweets
    const myTweets = [];
    console.log(`\n🔍 Fetching recent tweets for @${myUsername}...`);
    
    try {
      for await (const tweet of scraper.getTweetsAndReplies(myUsername, maxTweets)) {
        // Only include tweets by the bot
        if (tweet.username === myUsername) {
          myTweets.push(tweet);
          console.log(`Found tweet: "${tweet.text?.substring(0, 50)}..."`);
        }
      }
    } catch (searchError) {
      console.error('\n❌ Error fetching tweets:', searchError);
    }

    console.log(`\nFound ${myTweets.length} of your tweets to check for replies`);

    // Process each tweet and its replies
    for (const tweet of myTweets) {
      console.log(`\n📝 Checking replies for tweet: ${tweet.id}`);
      console.log(`Original tweet: "${tweet.text?.substring(0, 100)}..."`);

      try {
        // Use searchTweets to find replies to this tweet
        const replies = [];
        const replyQuery = `to:${myUsername} conversation_id:${tweet.id}`;
        
        for await (const reply of scraper.searchTweets(replyQuery, 10, 1)) {
          // Skip own replies and the original tweet
          if (reply.username !== myUsername && reply.id !== tweet.id) {
            replies.push(reply);
          }
        }
        
        console.log(`Found ${replies.length} replies to check`);

        // Process each reply
        for (const reply of replies) {
          // Skip if the reply mentions the agent (will be handled by mentions system)
          if (reply.text?.includes(`@${myUsername}`)) {
            console.log(`  🔄 Skipping reply from @${reply.username} - contains mention, will be handled by mentions system`);
            continue;
          }

          // Check if we've already replied to this tweet
          const hasReplied = await hasAlreadyReplied(scraper, reply.id, myUsername);
          if (hasReplied) {
            console.log(`  ↩️ Already replied to @${reply.username}'s tweet`);
            continue;
          }

          console.log(`\n  💬 Processing reply from @${reply.username}`);
          console.log(`  Reply text: "${reply.text?.substring(0, 100)}..."`);

          // Add time filter for replies
          const now = Date.now();
          if (reply.timeParsed && 
              (now - reply.timeParsed.getTime()) > (intervalMinutes * 60 * 1000)) {
            console.log(`  ⏰ Skipped: Reply too old from @${reply.username}`);
            continue;
          }

          // Generate and send reply
          await rateLimiter.wait();
          const customReplyText = await generateMentionReply(reply);
          console.log(`  Generated response: "${customReplyText}"`);

          await scraper.sendTweet(customReplyText, reply.id);
          console.log(`  ✨ Reply sent successfully`);

          // Add delay between replies
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (replyError) {
        console.error(`❌ Error processing replies for tweet ${tweet.id}:`, replyError);
        continue;
      }

      // Add longer delay between processing different tweets
      await new Promise(resolve => setTimeout(resolve, delayMs * 2.5));
    }

    console.log('\n=== Finished Processing Tweet Replies ===');
  } catch (error) {
    console.error('\n❌ Fatal error in handleTweetReplies:', error);
  }
}

// Update hasAlreadyReplied to use searchTweets instead
async function hasAlreadyReplied(scraper, tweetId, myUsername) {
  try {
    const replyQuery = `from:${myUsername} conversation_id:${tweetId}`;
    for await (const reply of scraper.searchTweets(replyQuery, 1, 1)) {
      if (reply.username === myUsername) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(`Error checking for existing replies to ${tweetId}:`, error);
    return false;
  }
}

// Update setupRealtimeSubscription to include target user tweet checks
async function setupRealtimeSubscription() {
  const terminal2 = supabase
    .channel('custom-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'terminal2'
      },
      async (payload) => {
        console.log('Change received!', payload);
        
        // Only process new records or records with status 'pending'
        if (payload.new && (payload.new.status === 'pending' || !payload.new.status)) {
          // Get the agent_id from the new/updated record
          const agentId = payload.new.agent_id;
          
          // Fetch corresponding Twitter credentials
          const twitterCredentials = await getTwitterCredentials(agentId);
          
          if (twitterCredentials) {
            console.log('Found Twitter credentials for agent:', agentId);
            const tweetContent = payload.new.tweet_content;
            
            if (!tweetContent) {
              console.error('Tweet content is empty or missing');
              await supabase
                .from('terminal2')
                .update({ status: 'failed', error_message: 'Tweet content is empty or missing' })
                .eq('id', payload.new.id);
              return;
            }
            
            console.log('Tweet content:', tweetContent);
            
            // Update status to processing
            await supabase
              .from('terminal2')
              .update({ status: 'processing' })
              .eq('id', payload.new.id);
            
            // Post the tweet using the credentials
            const success = await postTweet(twitterCredentials, tweetContent);
            
            if (success) {
              // Update the status in the database to "posted"
              await supabase
                .from('terminal2')
                .update({ status: 'posted', posted_at: new Date().toISOString() })
                .eq('id', payload.new.id);
              console.log('Database updated with posted status');
            } else {
              // Update the status to failed
              await supabase
                .from('terminal2')
                .update({ status: 'failed', error_message: 'Failed to post tweet' })
                .eq('id', payload.new.id);
              console.log('Database updated with failed status');
            }
          } else {
            console.log('No Twitter credentials found for agent:', agentId);
            await supabase
              .from('terminal2')
              .update({ status: 'failed', error_message: 'No Twitter credentials found' })
              .eq('id', payload.new.id);
          }
        } else {
          console.log('Skipping already processed record or record with non-pending status');
        }

        // Always fetch tweets when there's a new record
        if (payload.new && payload.new.agent_id) {
          const credentials = await getTwitterCredentials(payload.new.agent_id);
          if (credentials) {
            let scraper = null;
            try {
              scraper = await setupScraper(credentials);
              
              // Get interval from post_configuration
              const { data: agentData } = await supabase
                .from('agents2')
                .select('post_configuration')
                .eq('id', payload.new.agent_id)
                .single();

              const postConfig = typeof agentData?.post_configuration === 'string'
                ? JSON.parse(agentData.post_configuration)
                : agentData?.post_configuration;

              const intervalMinutes = postConfig?.interval || 30;
              
              console.log('\n=== Starting Periodic Checks ===');
              
              // Pass intervalMinutes to all checks
              console.log('\n📨 Checking mentions...');
              await replyToMentions(scraper, credentials, 10, 3000, intervalMinutes);
              
              console.log('\n💬 Checking replies to our tweets...');
              await handleTweetReplies(scraper, credentials, 20, 3000, intervalMinutes);
              
              // getTargetUserTweets already uses intervalMinutes
              console.log('\n🎯 Checking target users\' tweets...');
              const targetTweets = await getTargetUserTweets(payload.new.agent_id);
              
              // Process and reply to target tweets
              for (const tweet of targetTweets) {
                try {
                  // Check if we've already replied
                  const hasReplied = await hasAlreadyReplied(scraper, tweet.id, credentials.username);
                  if (hasReplied) {
                    console.log(`Already replied to @${tweet.username}'s tweet`);
                    continue;
                  }

                  // Generate and send reply
                  await rateLimiter.wait();
                  const customReplyText = await generateMentionReply(tweet);
                  console.log(`Replying to @${tweet.username}'s tweet: "${customReplyText}"`);

                  await scraper.sendTweet(customReplyText, tweet.id);
                  console.log('Reply sent successfully');

                  // Add delay between replies
                  await new Promise(resolve => setTimeout(resolve, 3000));
                } catch (replyError) {
                  console.error(`Error replying to target tweet:`, replyError);
                  continue;
                }
              }
              
              console.log('\n=== Completed All Checks ===');
              
            } catch (error) {
              console.error('Error during periodic checks:', error);
            } finally {
              if (scraper?.close) {
                await scraper.close();
              }
            }
          }
        }
      }
    )
    .subscribe();
}

// Helper function to set up the scraper with cookies or login
async function setupScraper(twitterCredentials) {
  const { username, password, email, twoFactorSecret, cookies, agent_id } = twitterCredentials;
  
  let scraper;
  
  // If we have saved cookies, try to use them first
  if (cookies && (Array.isArray(cookies) ? cookies.length > 0 : cookies)) {
    try {
      console.log('Attempting to use saved cookies...');
      
      // Process cookies if needed
      let cookieArray = cookies;
      if (typeof cookies === 'string') {
        try {
          cookieArray = JSON.parse(cookies);
        } catch (parseError) {
          cookieArray = cookies.includes('\n') 
            ? cookies.split('\n').filter(c => c.trim()) 
            : cookies.split(',').map(c => c.trim());
        }
      }
      
      // Use the fromCookies method as documented
      scraper = await Scraper.fromCookies(cookieArray);
      
      // Test if cookies are still valid
      const isLoggedIn = await scraper.isLoggedIn();
      if (!isLoggedIn) {
        throw new Error('Cookies are invalid or expired');
      }
      
      console.log('Cookies are valid, using existing session');
      return scraper;
    } catch (cookieError) {
      console.log('Cookies expired or invalid, logging in again:', cookieError.message);
    }
  }
  
  // No valid cookies, perform a fresh login
  console.log('Logging in to Twitter...');
  
  // Create scraper with options
  scraper = new Scraper({
    timeout: 120000,
    headless: false,
    slowMo: 100
  });
  
  try {
    console.log(`Logging in with username: ${username}`);
    const newCookies = await scraper.persistentLogin(username, password, email, twoFactorSecret);
    
    // Save the cookies for future use if we have an agent_id
    if (agent_id) {
      const cookieStrings = newCookies.map(cookie => cookie.toString());
      await updateTwitterCredentials(agent_id, cookieStrings);
    }
    
    return scraper;
  } catch (loginError) {
    console.error('Login error:', loginError);
    throw new Error(`Twitter login failed: ${loginError.message}`);
  }
}

// Start the server and setup subscription
app.listen(port, async () => {
  try {
    console.log(`Server running on port ${port}`);
    await setupRealtimeSubscription();
    console.log('Realtime subscription setup complete');
  } catch (error) {
    console.error('Error during server startup:', error);
  }
});

// Add a global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
