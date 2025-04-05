import React, { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wbsnlpviggcnwqfyfobh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic25scHZpZ2djbndxZnlmb2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODc2NTcwNiwiZXhwIjoyMDU0MzQxNzA2fQ.tr6PqbiAXQYSQSpG2wS6I4DZfV1Gc3dLXYhKwBrJLS0';
const supabase = createClient(supabaseUrl, supabaseKey);

const styles = {
  container: {
    width: '100%',
    minHeight: '100vh',
    margin: '0',
    padding: '1rem',
    background: '#000000',
    overflowX: 'hidden',
    '@media (min-width: 768px)': {
      padding: '2rem',
    },
  },
  innerContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    background: '#111111',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(255, 255, 255, 0.05)',
    padding: '1.5rem',
    border: '1px solid #333',
    '@media (min-width: 768px)': {
      padding: '2.5rem',
    },
  },
  title: {
    color: '#ffffff',
    fontSize: '1.75rem',
    marginBottom: '2rem',
    textAlign: 'center',
    fontWeight: '700',
    '@media (min-width: 768px)': {
      fontSize: '2.25rem',
    },
  },
  formSection: {
    marginBottom: '2rem',
    padding: '1.25rem',
    background: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #333',
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: '0 4px 12px rgba(255, 255, 255, 0.05)',
    },
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: '1.25rem',
    marginBottom: '1.5rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #333',
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#cccccc',
    fontWeight: '500',
    fontSize: '0.95rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #333',
    borderRadius: '8px',
    fontSize: '1rem',
    transition: 'all 0.2s ease',
    background: '#222',
    color: '#ffffff',
    '&:focus': {
      outline: 'none',
      borderColor: '#4299e1',
      boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.15)',
    },
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #333',
    borderRadius: '8px',
    fontSize: '1rem',
    transition: 'all 0.2s ease',
    resize: 'vertical',
    minHeight: '100px',
    background: '#222',
    color: '#ffffff',
    '&:focus': {
      outline: 'none',
      borderColor: '#4299e1',
      boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.15)',
    },
  },
  checkboxGroup: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    '@media (min-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    },
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease',
    color: '#cccccc',
    '&:hover': {
      backgroundColor: '#222',
    },
  },
  checkbox: {
    width: '1.125rem',
    height: '1.125rem',
    borderRadius: '4px',
    cursor: 'pointer',
    accentColor: '#4299e1',
  },
  fileUpload: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  fileUploadButton: {
    padding: '0.75rem 1.25rem',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: '500',
    '&:hover': {
      background: '#3182ce',
      transform: 'translateY(-1px)',
    },
  },
  fileUploadText: {
    color: '#999999',
    fontSize: '0.875rem',
    flex: '1',
    wordBreak: 'break-all',
  },
  usernameInput: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  usernameButton: {
    padding: '0.75rem 1.5rem',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: '500',
    '&:hover': {
      background: '#3182ce',
      transform: 'translateY(-1px)',
    },
  },
  usernameList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  usernameTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.875rem',
    background: '#333',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    color: '#ffffff',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: '#444',
    },
  },
  usernameTagButton: {
    background: 'none',
    border: 'none',
    color: '#999999',
    cursor: 'pointer',
    padding: '0 0.25rem',
    fontSize: '1.25rem',
    lineHeight: 1,
    transition: 'color 0.2s ease',
    '&:hover': {
      color: '#ff4444',
    },
  },
  radioGroup: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  formActions: {
    marginTop: '2.5rem',
    textAlign: 'center',
  },
  createButton: {
    padding: '1rem 2.5rem',
    background: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: '#38a169',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(72, 187, 120, 0.2)',
    },
  },
  createButtonDisabled: {
    background: '#4a5568',
    cursor: 'not-allowed',
    '&:hover': {
      transform: 'none',
      boxShadow: 'none',
    },
  },
};

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
    <div style={styles.container}>
      <div style={styles.innerContainer}>
        <h1 style={styles.title}>Create an AI Agent</h1>
        
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Basic Information</h2>
          <div style={styles.formGroup}>
            <label style={styles.label}>Agent Name*</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Enter agent name"
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              value={agentDescription}
              onChange={(e) => setAgentDescription(e.target.value)}
              placeholder="Describe what your agent does"
              rows="3"
              style={styles.textarea}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Profile Image</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <div style={styles.fileUpload}>
              <button onClick={handleUploadClick} style={styles.fileUploadButton}>Choose File</button>
              <span style={styles.fileUploadText}>{agentImage ? agentImage.name : 'No file chosen'}</span>
            </div>
          </div>
        </div>
        
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Agent Capabilities</h2>
          <div style={styles.formGroup}>
            <label style={styles.label}>Activities</label>
            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedActivities.includes('post')}
                  onChange={() => handleActivitySelect('post')}
                  style={styles.checkbox}
                />
                Act Sentiently
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedActivities.includes('chat')}
                  onChange={() => handleActivitySelect('chat')}
                  style={styles.checkbox}
                />
                Chat and Interact
              </label>
            </div>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Data Sources</label>
            <div style={styles.checkboxGroup}>
              {dataSources.map((source, index) => (
                <label key={index} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedSources.includes(source)}
                    onChange={() => handleSourceClick(source)}
                    style={styles.checkbox}
                  />
                  {source}
                </label>
              ))}
            </div>
          </div>
        </div>
        
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Agent Intelligence</h2>
          <div style={styles.formGroup}>
            <label style={styles.label}>Prompt / Persona*</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how your agent should behave and respond"
              rows="4"
              required
              style={styles.textarea}
            />
          </div>
        </div>
        
        {selectedActivities.includes('post') && (
          <div style={styles.formSection}>
            <h2 style={styles.sectionTitle}>Posting Configuration</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Posting Platforms</label>
              <div style={styles.checkboxGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={postingClients.includes('terminal')}
                    onChange={() => setPostingClients(prev => 
                      prev.includes('terminal') ? prev.filter(c => c !== 'terminal') : [...prev, 'terminal']
                    )}
                    style={styles.checkbox}
                  />
                  Terminal
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={postingClients.includes('x')}
                    onChange={() => setPostingClients(prev => 
                      prev.includes('x') ? prev.filter(c => c !== 'x') : [...prev, 'x']
                    )}
                    style={styles.checkbox}
                  />
                  X (Twitter)
                </label>
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Posting Interval (minutes)</label>
              <input
                type="number"
                value={postingInterval}
                onChange={(e) => setPostingInterval(e.target.value)}
                min="2"
                placeholder="60"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Posting Topics</label>
              <textarea
                value={postingTopics}
                onChange={(e) => setPostingTopics(e.target.value)}
                placeholder="Topics your agent should post about"
                rows="3"
                style={styles.textarea}
              />
            </div>
          </div>
        )}
        
        {selectedActivities.includes('chat') && (
          <div style={styles.formSection}>
            <h2 style={styles.sectionTitle}>Chat Configuration</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Chat Platforms</label>
              <div style={styles.checkboxGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={chatClients.includes('terminal')}
                    onChange={() => setChatClients(prev => 
                      prev.includes('terminal') ? prev.filter(c => c !== 'terminal') : [...prev, 'terminal']
                    )}
                    style={styles.checkbox}
                  />
                  Terminal
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={chatClients.includes('x')}
                    onChange={() => setChatClients(prev => 
                      prev.includes('x') ? prev.filter(c => c !== 'x') : [...prev, 'x']
                    )}
                    style={styles.checkbox}
                  />
                  X (Twitter)
                </label>
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Reply to Usernames</label>
              <div style={styles.usernameInput}>
                <input
                  type="text"
                  value={currentUsername}
                  onChange={(e) => setCurrentUsername(e.target.value)}
                  placeholder="Enter username without @"
                  style={styles.input}
                />
                <button onClick={handleAddUsername} style={styles.usernameButton}>Add</button>
              </div>
              
              {replyToUsernames.length > 0 && (
                <div style={styles.usernameList}>
                  {replyToUsernames.map((username, index) => (
                    <div key={index} style={styles.usernameTag}>
                      @{username}
                      <button 
                        onClick={() => handleRemoveUsername(username)}
                        style={styles.usernameTagButton}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={replyToReplies}
                  onChange={() => setReplyToReplies(!replyToReplies)}
                  style={styles.checkbox}
                />
                Reply to post replies and quote tweets
              </label>
            </div>
          </div>
        )}
        
        {(postingClients.includes('x') || chatClients.includes('x')) && (
          <div style={styles.formSection}>
            <h2 style={styles.sectionTitle}>X Account Configuration</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Set up X account now?</label>
              <div style={styles.radioGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    checked={setupX === true}
                    onChange={() => setSetupX(true)}
                    style={styles.checkbox}
                  />
                  Yes
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    checked={setupX === false}
                    onChange={() => setSetupX(false)}
                    style={styles.checkbox}
                  />
                  Skip for now
                </label>
              </div>
            </div>
            
            {setupX && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Twitter Username*</label>
                  <input
                    type="text"
                    value={twitterUsername}
                    onChange={(e) => setTwitterUsername(e.target.value)}
                    placeholder="@username"
                    required={setupX}
                    style={styles.input}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Twitter Email*</label>
                  <input
                    type="email"
                    value={twitterEmail}
                    onChange={(e) => setTwitterEmail(e.target.value)}
                    placeholder="email@example.com"
                    required={setupX}
                    style={styles.input}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Twitter Password*</label>
                  <input
                    type="password"
                    value={twitterPassword}
                    onChange={(e) => setTwitterPassword(e.target.value)}
                    placeholder="Enter your password"
                    required={setupX}
                    style={styles.input}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Twitter 2FA Secret (if applicable)</label>
                  <input
                    type="text"
                    value={twitter2FASecret}
                    onChange={(e) => setTwitter2FASecret(e.target.value)}
                    placeholder="Enter your 2FA secret"
                    style={styles.input}
                  />
                </div>
              </>
            )}
          </div>
        )}
        
        <div style={styles.formActions}>
          <button 
            style={{
              ...styles.createButton,
              ...(isCreating || !agentName || !prompt ? styles.createButtonDisabled : {})
            }}
            onClick={handleCreateAgent}
            disabled={isCreating || !agentName || !prompt}
          >
            {isCreating ? 'Creating Agent...' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentLauncher;
