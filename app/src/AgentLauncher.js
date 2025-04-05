import React, { useState, useRef } from 'react';
import './AgentLauncher.css';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wbsnlpviggcnwqfyfobh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic25scHZpZ2djbndxZnlmb2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODc2NTcwNiwiZXhwIjoyMDU0MzQxNzA2fQ.tr6PqbiAXQYSQSpG2wS6I4DZfV1Gc3dLXYhKwBrJLS0';
const supabase = createClient(supabaseUrl, supabaseKey);

const AgentLauncher = () => {
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentImage, setAgentImage] = useState(null);
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const fileInputRef = useRef(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [postingClients, setPostingClients] = useState([]);
  const [postingInterval, setPostingInterval] = useState('60');
  const [postingTopics, setPostingTopics] = useState('');
  const [chatClients, setChatClients] = useState([]);
  const [replyToUsernames, setReplyToUsernames] = useState([]);
  const [replyToReplies, setReplyToReplies] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [twitterUsername, setTwitterUsername] = useState('');
  const [twitterPassword, setTwitterPassword] = useState('');
  const [twitterEmail, setTwitterEmail] = useState('');
  const [twitter2FASecret, setTwitter2FASecret] = useState('');
  const [setupX, setSetupX] = useState(false);

  const dataSources = [
    'Market data',
    'Social sentiment',
    'News feeds',
    'Portfolio data',
    'Transaction History',
    'Events query',
    'Technical analysis'
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB check
        alert('File size must be less than 1MB');
        return;
      }
      setAgentImage(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleSourceClick = (source) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const handleActivitySelect = (activity) => {
    setSelectedActivities(prev => 
      prev.includes(activity) 
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const handleAddUsername = () => {
    const username = currentUsername.trim().replace(/^@+/, '');
    if (username && !replyToUsernames.includes(username)) {
      setReplyToUsernames([...replyToUsernames, username]);
      setCurrentUsername('');
    }
  };

  const handleRemoveUsername = (usernameToRemove) => {
    setReplyToUsernames(replyToUsernames.filter(username => username !== usernameToRemove));
  };

  const handleCreateAgent = async () => {
    setIsCreating(true);
    try {
      // Validate posting interval
      if (postingInterval && parseInt(postingInterval) < 2) {
        alert('Posting interval must be at least 2 minutes');
        setIsCreating(false);
        return;
      }

      // Check if bucket exists, if not create it
      const { error: bucketError } = await supabase
        .storage
        .createBucket('images', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
          fileSizeLimit: 1024 * 1024 * 2 // 2MB
        });

      // Upload image to storage if exists
      let imageUrl = null;
      if (agentImage) {
        const fileExt = agentImage.name.split('.').pop();
        const filePath = `agent-images/${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('images')
          .upload(filePath, agentImage, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (uploadError) throw uploadError;
        
        // Get the public URL for the uploaded image
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrl;
      }

      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      // Prepare post and chat configurations
      const postConfiguration = {
        clients: postingClients,
        interval: parseInt(postingInterval),
        topics: postingTopics,
        enabled: postingClients.length > 0
      };

      const chatConfiguration = {
        clients: chatClients,
        reply_to_usernames: replyToUsernames,
        reply_to_replies: replyToReplies,
        enabled: chatClients.length > 0
      };

      // Prepare Twitter credentials if they exist
      let twitter_credentials = null;
      if ((postingClients.includes('x') || chatClients.includes('x')) && setupX) {
        if (twitterUsername && twitterPassword && twitterEmail) {
          twitter_credentials = {
            'TWITTER_USERNAME=': twitterUsername.trim(),
            'TWITTER_PASSWORD=': twitterPassword,
            'TWITTER_EMAIL=': twitterEmail.trim(),
            'TWITTER_2FA_SECRET=': twitter2FASecret.trim()
          };
        } else {
          // If X is selected as a client but credentials are not set up
          alert('Please set up X credentials or remove X from the clients');
          setIsCreating(false);
          return;
        }
      }

      // Insert agent data into agents2 table
      const { data: agentData, error } = await supabase
        .from('agents2')
        .insert([
          {
            name: agentName,
            description: agentDescription,
            prompt: prompt,
            image: imageUrl,
            user_id: session?.user?.id,
            data_sources: selectedSources,
            activities: selectedActivities,
            post_configuration: postConfiguration,
            chat_configuration: chatConfiguration,
            twitter_credentials: twitter_credentials ? JSON.stringify(twitter_credentials) : null
          }
        ])
        .select();

      if (error) throw error;

      // Only proceed if we actually have agent data
      if (agentData && agentData.length > 0) {
        const agentId = agentData[0].id;
        console.log('Agent created successfully:', agentId);
        
        // Set up posting schedule if posting is enabled
        if (postConfiguration.enabled) {          
          console.log('Posting configuration is enabled. Setting up posting schedule for agent ID:', agentId);
          
          // Format the topics and prompt
          const sanitizedTopics = postingTopics.trim().replace(/\s+/g, ' ');
          const sanitizedPrompt = prompt.trim().replace(/\s+/g, ' ');
          
          const postingPayload = {
            userId: agentId,
            interval: parseInt(postingInterval),
            query: sanitizedTopics ? `speak about ${sanitizedTopics} while you have access to access to these data sources: ${selectedSources.join(', ')}` : 'speak about general topics',
            systemPrompt: `You are an AI agent who tweets. ${sanitizedPrompt} Keep all tweets under 260 characters.`
          };
          
          const response = await fetch(
            'https://97m15gg62a.execute-api.ap-south-1.amazonaws.com/prod/create',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(postingPayload),
              signal: AbortSignal.timeout(10000)
            }
          );
          
          if (!response.ok) {
            console.log('Posting schedule API call failed with status:', response.status);
          }
        }
        
        // Show success message
        alert(`${agentName} has been created successfully!`);
      } else {
        throw new Error('Agent creation failed: No agent data returned');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      alert(`Failed to create agent: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="agent-launcher-form">
      <h1>Create an AI Agent</h1>
      
      <div className="form-section">
        <h2>Basic Information</h2>
        <div className="form-group">
          <label>Agent Name*</label>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Enter agent name"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={agentDescription}
            onChange={(e) => setAgentDescription(e.target.value)}
            placeholder="Describe what your agent does"
            rows="3"
          />
        </div>
        
        <div className="form-group">
          <label>Profile Image</label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <div className="file-upload">
            <button onClick={handleUploadClick}>Choose File</button>
            <span>{agentImage ? agentImage.name : 'No file chosen'}</span>
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h2>Agent Capabilities</h2>
        <div className="form-group">
          <label>Activities</label>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={selectedActivities.includes('post')}
                onChange={() => handleActivitySelect('post')}
              />
              Act Sentiently
            </label>
            <label>
              <input
                type="checkbox"
                checked={selectedActivities.includes('chat')}
                onChange={() => handleActivitySelect('chat')}
              />
              Chat and Interact
            </label>
          </div>
        </div>
        
        <div className="form-group">
          <label>Data Sources</label>
          <div className="checkbox-group">
            {dataSources.map((source, index) => (
              <label key={index}>
                <input
                  type="checkbox"
                  checked={selectedSources.includes(source)}
                  onChange={() => handleSourceClick(source)}
                />
                {source}
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h2>Agent Intelligence</h2>
        <div className="form-group">
          <label>Prompt / Persona*</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe how your agent should behave and respond"
            rows="4"
            required
          />
        </div>
      </div>
      
      {selectedActivities.includes('post') && (
        <div className="form-section">
          <h2>Posting Configuration</h2>
          <div className="form-group">
            <label>Posting Platforms</label>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={postingClients.includes('terminal')}
                  onChange={() => setPostingClients(prev => 
                    prev.includes('terminal') ? prev.filter(c => c !== 'terminal') : [...prev, 'terminal']
                  )}
                />
                Terminal
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={postingClients.includes('x')}
                  onChange={() => setPostingClients(prev => 
                    prev.includes('x') ? prev.filter(c => c !== 'x') : [...prev, 'x']
                  )}
                />
                X (Twitter)
              </label>
            </div>
          </div>
          
          <div className="form-group">
            <label>Posting Interval (minutes)</label>
            <input
              type="number"
              value={postingInterval}
              onChange={(e) => setPostingInterval(e.target.value)}
              min="2"
              placeholder="60"
            />
          </div>
          
          <div className="form-group">
            <label>Posting Topics</label>
            <textarea
              value={postingTopics}
              onChange={(e) => setPostingTopics(e.target.value)}
              placeholder="Topics your agent should post about"
              rows="3"
            />
          </div>
        </div>
      )}
      
      {selectedActivities.includes('chat') && (
        <div className="form-section">
          <h2>Chat Configuration</h2>
          <div className="form-group">
            <label>Chat Platforms</label>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={chatClients.includes('terminal')}
                  onChange={() => setChatClients(prev => 
                    prev.includes('terminal') ? prev.filter(c => c !== 'terminal') : [...prev, 'terminal']
                  )}
                />
                Terminal
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={chatClients.includes('x')}
                  onChange={() => setChatClients(prev => 
                    prev.includes('x') ? prev.filter(c => c !== 'x') : [...prev, 'x']
                  )}
                />
                X (Twitter)
              </label>
            </div>
          </div>
          
          <div className="form-group">
            <label>Reply to Usernames</label>
            <div className="username-input">
              <input
                type="text"
                value={currentUsername}
                onChange={(e) => setCurrentUsername(e.target.value)}
                placeholder="Enter username without @"
              />
              <button onClick={handleAddUsername}>Add</button>
            </div>
            
            {replyToUsernames.length > 0 && (
              <div className="username-list">
                {replyToUsernames.map((username, index) => (
                  <div key={index} className="username-tag">
                    @{username}
                    <button onClick={() => handleRemoveUsername(username)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={replyToReplies}
                onChange={() => setReplyToReplies(!replyToReplies)}
              />
              Reply to post replies and quote tweets
            </label>
          </div>
        </div>
      )}
      
      {(postingClients.includes('x') || chatClients.includes('x')) && (
        <div className="form-section">
          <h2>X Account Configuration</h2>
          <div className="form-group">
            <label>Set up X account now?</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  checked={setupX === true}
                  onChange={() => setSetupX(true)}
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  checked={setupX === false}
                  onChange={() => setSetupX(false)}
                />
                Skip for now
              </label>
            </div>
          </div>
          
          {setupX && (
            <>
              <div className="form-group">
                <label>Twitter Username*</label>
                <input
                  type="text"
                  value={twitterUsername}
                  onChange={(e) => setTwitterUsername(e.target.value)}
                  placeholder="@username"
                  required={setupX}
                />
              </div>
              
              <div className="form-group">
                <label>Twitter Email*</label>
                <input
                  type="email"
                  value={twitterEmail}
                  onChange={(e) => setTwitterEmail(e.target.value)}
                  placeholder="email@example.com"
                  required={setupX}
                />
              </div>
              
              <div className="form-group">
                <label>Twitter Password*</label>
                <input
                  type="password"
                  value={twitterPassword}
                  onChange={(e) => setTwitterPassword(e.target.value)}
                  placeholder="Enter your password"
                  required={setupX}
                />
              </div>
              
              <div className="form-group">
                <label>Twitter 2FA Secret (if applicable)</label>
                <input
                  type="text"
                  value={twitter2FASecret}
                  onChange={(e) => setTwitter2FASecret(e.target.value)}
                  placeholder="Enter your 2FA secret"
                />
              </div>
            </>
          )}
        </div>
      )}
      
      <div className="form-actions">
        <button 
          className="create-button"
          onClick={handleCreateAgent}
          disabled={isCreating || !agentName || !prompt}
        >
          {isCreating ? 'Creating Agent...' : 'Create Agent'}
        </button>
      </div>
    </div>
  );
};

export default AgentLauncher;
