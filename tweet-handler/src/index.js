const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Scraper} = require('twitter-agent');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Add CORS middleware

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Function to fetch user wallet address
async function getUserWalletAddress(username) {
  try {
    console.log(`Fetching wallet address for username: ${username}`);
    const response = await fetch(`https://agent-launcher.onrender.com/user?username=${username}`);
    
    if (!response.ok) {
      console.error(`API request failed with status: ${response.status}`);
      return null;
    }
    
    const userData = await response.json();
    console.log(`User data response:`, userData);
    
    // Extract wallet address from response - now looking for 'address' field
    const walletAddress = userData?.address || null;
    
    if (walletAddress) {
      console.log(`Found wallet address for ${username}: ${walletAddress}`);
    } else {
      console.log(`No wallet address found for ${username}`);
    }
    
    return walletAddress;
  } catch (error) {
    console.error(`Error fetching user wallet address:`, error);
    return null;
  }
}

// Function to extract image URLs from tweet content
function extractImageUrl(text) {
  if (!text) return null;
  
  // Regular expression to match Supabase URL patterns
  const supabaseUrlRegex = /(https?:\/\/\S+\.supabase\.\S+\/storage\/v\S+\.(jpg|jpeg|png|gif|webp)(\?\S*)?)/i;
  const supabaseMatch = text.match(supabaseUrlRegex);
  if (supabaseMatch) {
    console.log('Found Supabase image URL:', supabaseMatch[0]);
    return supabaseMatch[0];
  }
  
  // General image URL pattern as fallback
  const generalImageRegex = /(https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)(\?\S*)?)/i;
  const generalMatch = text.match(generalImageRegex);
  if (generalMatch) {
    console.log('Found general image URL:', generalMatch[0]);
    return generalMatch[0];
  }
  
  console.log('No image URLs found in text');
  return null;
}

// Function to download image from URL
async function downloadImage(url) {
  try {
    console.log(`Downloading image from ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`URL does not point to an image: ${contentType}`);
    }
    
    const buffer = await response.buffer();
    
    // Create a temp directory if it doesn't exist
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    // Generate a unique filename
    const filename = path.join(tempDir, `image_${Date.now()}.${contentType.split('/')[1]}`);
    
    // Save the file
    fs.writeFileSync(filename, buffer);
    console.log(`Image saved to ${filename}`);
    
    return {
      path: filename,
      data: buffer,
      mediaType: contentType
    };
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

// Function to clean up temporary image files
function cleanupTempImages() {
  try {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      return;
    }
    
    // Read all files in the temp directory
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Remove files older than 1 hour
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtime.getTime();
      
      // If file is older than 1 hour, delete it
      if (fileAge > ONE_HOUR) {
        fs.unlinkSync(filePath);
        console.log(`Removed old temp file: ${filePath}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up temp images:', error);
  }
}

// Function to clean tweet content by removing the image URL
function cleanTweetContent(content, imageUrl) {
  if (!content || !imageUrl) return content;
  
  // Remove the URL from the tweet content
  return content.replace(imageUrl, '').trim();
}

// Function to post tweet using twitter-agent with cookie-based authentication
async function postTweet(twitterCredentials, tweetContent) {
  let scraper = null;
  let tempImagePath = null;
  
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
    
    // Check if tweet contains an image URL
    let mediaData = null;
    const imageUrl = extractImageUrl(tweetContent);
    let cleanedContent = tweetContent;
    
    if (imageUrl) {
      console.log('Found image URL in tweet content:', imageUrl);
      
      // Download the image
      const imageData = await downloadImage(imageUrl);
      
      if (imageData) {
        // Store temp image path for cleanup
        tempImagePath = imageData.path;
        
        // Clean the tweet content by removing the image URL
        cleanedContent = cleanTweetContent(tweetContent, imageUrl);
        
        // Prepare media data for twitter-agent
        mediaData = [{
          data: imageData.data,
          mediaType: imageData.mediaType
        }];
        
        console.log('Prepared media data for tweet');
      }
    }
    
    // Split content into thread if it contains blank lines
    const tweets = cleanedContent.split('\n\n').filter(tweet => tweet.trim());
    
    if (tweets.length > 1) {
      console.log(`Creating thread with ${tweets.length} tweets`);
      // Only attach media to the first tweet in a thread
      await createThread(scraper, tweets, mediaData);
    } else {
      // Single tweet case
      console.log('Sending single tweet with content:', tweets[0]);
      await scraper.sendTweet(tweets[0], undefined, mediaData);
    }

    // Close browser after tweet is sent
    if (scraper?.close) {
      await scraper.close();
    }

    // Clean up temporary image file if it exists
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      fs.unlinkSync(tempImagePath);
      console.log(`Deleted temporary image file: ${tempImagePath}`);
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
    
    // Clean up temporary image file even if tweet failed
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      fs.unlinkSync(tempImagePath);
      console.log(`Deleted temporary image file after error: ${tempImagePath}`);
    }
    
    return false;
  }
}

// Add createThread function with media support
async function createThread(scraper, threadContent, mediaData = null, options = {}) {
  const { delayBetweenTweets = 3000, indexingDelay = 10000 } = options;
  let previousTweetId = null;

  for (let i = 0; i < threadContent.length; i++) {
    const tweetText = threadContent[i];
    // Only include media with the first tweet
    const tweetMedia = i === 0 ? mediaData : null;
    
    const tweetResult = await scraper.sendTweet(
      tweetText,
      i === 0 ? null : previousTweetId,
      tweetMedia
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
async function getAIAnalysis(tweetText, username, agentId) {
  try {
    // Try to get wallet address if username is provided
    let walletAddress = null;
    if (username) {
      walletAddress = await getUserWalletAddress(username);
    }
    
    // Get agent description
    const agentDescription = await getAgentDescription(agentId);
    
    // Construct the system prompt with wallet address and agent description if available
    let systemPrompt = "You are a helpful AI assistant. Analyze the tweet and provide a natural, engaging response. Keep responses concise and friendly. Don't use hashtags or emojis unless they were in the original tweet, dont mention any data errors and keep it under 200 characters.You are a twitter reply guy";
    
    if (agentDescription) {
      systemPrompt += `. Your description is: ${agentDescription}`;
    }
    
    if (walletAddress) {
      systemPrompt += ` The address of the user you're responding to is ${walletAddress}.`;
    }
    
    const response = await fetch('https://agent-launcher.onrender.com/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: tweetText,
        systemPrompt: systemPrompt
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
    const analysis = await getAIAnalysis(tweet.text || '', tweet.username, tweet.agent_id);
    
    if (analysis) {
      let replyText = analysis;
      // Ensure the reply starts with the username mention
      if (!replyText.startsWith(`@${tweet.username}`)) {
        replyText = `@${tweet.username} ${replyText}`;
      }
      return replyText;
    }
    
    // Fallback to default responses if AI analysis fails
    let replyText = `@${tweet.username} `;
    const tweetText = tweet.text?.toLowerCase() || '';
    
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
        
        await rateLimiter.wait();
        console.log('Rate limit respected');
        
        const customReplyText = await generateMentionReply(tweet);
        console.log(`Generated reply: "${customReplyText}"`);
        
        // Check if reply contains an image URL
        let mediaData = null;
        let tempImagePath = null;
        const imageUrl = extractImageUrl(customReplyText);
        let cleanedReplyText = customReplyText;
        
        if (imageUrl) {
          console.log('Found image URL in reply:', imageUrl);
          
          // Download the image
          const imageData = await downloadImage(imageUrl);
          
          if (imageData) {
            // Store temp image path for cleanup
            tempImagePath = imageData.path;
            
            // Clean the reply text by removing the image URL
            cleanedReplyText = cleanTweetContent(customReplyText, imageUrl);
            
            // Prepare media data for twitter-agent
            mediaData = [{
              data: imageData.data,
              mediaType: imageData.mediaType
            }];
            
            console.log('Prepared media data for reply');
          }
        }
        
        // Use sendTweet with media if available
        await scraper.sendTweet(cleanedReplyText, tweet.id, mediaData);
        console.log('✨ Reply sent successfully');
        
        // Clean up temporary image file if it exists
        if (tempImagePath && fs.existsSync(tempImagePath)) {
          fs.unlinkSync(tempImagePath);
          console.log(`Deleted temporary image file: ${tempImagePath}`);
        }
        
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

// Update handleTweetReplies to handle image replies
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

          // Check if reply contains an image URL
          let mediaData = null;
          let tempImagePath = null;
          const imageUrl = extractImageUrl(customReplyText);
          let cleanedReplyText = customReplyText;
          
          if (imageUrl) {
            console.log('  Found image URL in reply:', imageUrl);
            
            // Download the image
            const imageData = await downloadImage(imageUrl);
            
            if (imageData) {
              // Store temp image path for cleanup
              tempImagePath = imageData.path;
              
              // Clean the reply text by removing the image URL
              cleanedReplyText = cleanTweetContent(customReplyText, imageUrl);
              
              // Prepare media data for twitter-agent
              mediaData = [{
                data: imageData.data,
                mediaType: imageData.mediaType
              }];
              
              console.log('  Prepared media data for reply');
            }
          }

          await scraper.sendTweet(cleanedReplyText, reply.id, mediaData);
          console.log(`  ✨ Reply sent successfully`);
          
          // Clean up temporary image file if it exists
          if (tempImagePath && fs.existsSync(tempImagePath)) {
            fs.unlinkSync(tempImagePath);
            console.log(`  Deleted temporary image file: ${tempImagePath}`);
          }

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

// Update setupRealtimeSubscription target user tweet handling
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
            let tweetContent = payload.new.tweet_content;
            
            if (!tweetContent) {
              console.error('Tweet content is empty or missing');
              await supabase
                .from('terminal2')
                .update({ status: 'failed', error_message: 'Tweet content is empty or missing' })
                .eq('id', payload.new.id);
              return;
            }
            
            // Remove any text between <think> tags
            tweetContent = tweetContent.replace(/<think>.*?<\/think>/gs, '').trim();
            
            console.log('Tweet content after removing think tags:', tweetContent);
            
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

                  // Check if reply contains an image URL
                  let mediaData = null;
                  let tempImagePath = null;
                  const imageUrl = extractImageUrl(customReplyText);
                  let cleanedReplyText = customReplyText;
                  
                  if (imageUrl) {
                    console.log('Found image URL in reply:', imageUrl);
                    
                    // Download the image
                    const imageData = await downloadImage(imageUrl);
                    
                    if (imageData) {
                      // Store temp image path for cleanup
                      tempImagePath = imageData.path;
                      
                      // Clean the reply text by removing the image URL
                      cleanedReplyText = cleanTweetContent(customReplyText, imageUrl);
                      
                      // Prepare media data for twitter-agent
                      mediaData = [{
                        data: imageData.data,
                        mediaType: imageData.mediaType
                      }];
                      
                      console.log('Prepared media data for reply');
                    }
                  }

                  await scraper.sendTweet(cleanedReplyText, tweet.id, mediaData);
                  console.log('Reply sent successfully');
                  
                  // Clean up temporary image file if it exists
                  if (tempImagePath && fs.existsSync(tempImagePath)) {
                    fs.unlinkSync(tempImagePath);
                    console.log(`Deleted temporary image file: ${tempImagePath}`);
                  }

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

// Function to fetch agent description
async function getAgentDescription(agentId) {
  // Convert agentId to number if it's a string
  const numericAgentId = typeof agentId === 'string' ? parseInt(agentId, 10) : agentId;

  // Validate agentId is a valid number
  if (isNaN(numericAgentId)) {
    console.error('Error fetching agent description: agentId must be a valid number');
    return null;
  }

  const { data, error } = await supabase
    .from('agents2')
    .select('description')
    .eq('id', numericAgentId)
    .single();

  if (error) {
    console.error('Error fetching agent description:', error);
    return null;
  }
  
  if (!data?.description) {
    console.log('No description found for agent:', numericAgentId);
    return null;
  }
  
  console.log('Retrieved description for agent', numericAgentId);
  return data.description;
}

// Start the server and setup subscription
app.listen(port, async () => {
  try {
    console.log(`Server running on port ${port}`);
    await setupRealtimeSubscription();
    console.log('Realtime subscription setup complete');
    
    // Set up periodic cleanup of temp images (every hour)
    setInterval(cleanupTempImages, 60 * 60 * 1000);
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
