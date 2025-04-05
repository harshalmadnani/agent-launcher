import { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';

// Helper function to detect Chrome extension errors
const isChromeExtensionError = (error) => {
  if (!error) return false;
  const errorString = error.toString();
  const errorMessage = error.message || '';
  
  return (
    errorString.includes('chrome.runtime') ||
    errorString.includes('Extension context') ||
    errorMessage.includes('message port closed') ||
    errorMessage.includes('runtime.lastError') ||
    (error.stack && error.stack.includes('chrome-extension://'))
  );
};

const ChatInterface = () => {
  const [inputValue, setInputValue] = useState('');
  const [isWelcomeScreen, setIsWelcomeScreen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Add logging on component mount
  useEffect(() => {
    console.log('ChatInterface component mounted');
    
    // Handle potential Chrome extension errors
    if (window.chrome && window.chrome.runtime) {
      console.log('Chrome runtime detected, adding error listener');
      
      // Patch runtime.sendMessage to handle errors gracefully
      try {
        const originalSendMessage = window.chrome.runtime.sendMessage;
        window.chrome.runtime.sendMessage = function() {
          try {
            const result = originalSendMessage.apply(this, arguments);
            // Check for runtime.lastError after the call
            if (window.chrome.runtime.lastError) {
              console.log('chrome.runtime.lastError detected:', window.chrome.runtime.lastError);
              // Reading lastError clears it, preventing unhandled error
            }
            return result;
          } catch (e) {
            console.log('Caught chrome.runtime.sendMessage error:', e);
            return undefined;
          }
        };
        console.log('Successfully patched chrome.runtime.sendMessage');
      } catch (err) {
        console.log('Failed to patch chrome.runtime methods:', err);
      }
    }

    // Add global error listeners
    const handleGlobalError = (event) => {
      console.log('Global error caught:', event.error);
      
      if (event.error && isChromeExtensionError(event.error)) {
        console.log('Chrome extension error detected:', {
          message: event.message,
          source: event.filename,
          line: event.lineno,
          column: event.colno
        });
        
        // Prevent the extension error from affecting our app
        event.preventDefault();
        return;
      }
      
      console.log('Error message:', event.message);
      console.log('Error source:', event.filename, event.lineno, event.colno);
    };

    const handleUnhandledRejection = (event) => {
      console.log('Unhandled promise rejection caught:', event.reason);
      
      if (event.reason && isChromeExtensionError(event.reason)) {
        console.log('Chrome extension error in promise rejection:', {
          message: event.reason.message || event.reason,
        });
        
        // Prevent the extension error from affecting our app
        event.preventDefault();
        return;
      }
      
      console.log('Promise:', event.promise);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.log('ChatInterface component unmounted');
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };
  
  const fetchBotResponse = async (userQuery) => {
    console.log('Fetching bot response for query:', userQuery);
    setIsLoading(true);
    try {
      console.log('Making API request to analyze endpoint');
      const response = await fetch('https://agent-launcher.onrender.com/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: userQuery,
          systemPrompt: "You are a helpful AI assistant. Provide natural, engaging responses to user queries. Keep responses concise and informative. For financial or cryptocurrency questions, include a disclaimer about volatility if relevant."
        })
      });

      console.log('API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Network response error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API response data received:', data);
      
      // Extract the response, handling various response formats
      let responseText = null;
      
      if (data.response) {
        responseText = data.response;
      } else if (data.data?.analysis) {
        responseText = data.data.analysis;
      } else if (data.result?.description) {
        responseText = data.result.description;
      } else if (typeof data.data === 'string') {
        responseText = data.data;
      } else if (typeof data.result === 'string') {
        responseText = data.result;
      }
      
      // Remove any text between <think> tags if present
      if (responseText) {
        responseText = responseText.replace(/<think>.*?<\/think>/gs, '');
      }
      
      if (!responseText) {
        console.error('Invalid response format:', data);
        responseText = "Sorry, I couldn't understand the response format. Please try again.";
      }
      
      // Add bot response
      const botMessage = {
        id: messages.length + 2,
        text: responseText,
        sender: 'bot'
      };
      
      setMessages(prevMessages => [...prevMessages, botMessage]);
      console.log('Bot message added to chat');
    } catch (error) {
      console.error('Error fetching response:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      // Check if this is a Chrome extension error
      if (isChromeExtensionError(error)) {
        console.log('Chrome extension error detected in fetch operation - ignoring');
        
        // Add a special error message for extension errors
        const errorMessage = {
          id: messages.length + 2,
          text: "Sorry, I encountered a browser extension error. This doesn't affect your conversation, but you may want to try disabling some browser extensions if this persists.",
          sender: 'bot'
        };
        
        setMessages(prevMessages => [...prevMessages, errorMessage]);
        console.log('Extension error message added to chat');
        return;
      }
      
      // Add regular error message for other errors
      const errorMessage = {
        id: messages.length + 2,
        text: "Sorry, I encountered an error processing your request. Please try again later.",
        sender: 'bot'
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      console.log('Error message added to chat');
    } finally {
      setIsLoading(false);
      console.log('Loading state reset to false');
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted, input value:', inputValue.trim() ? 'non-empty' : 'empty');
    
    if (!inputValue.trim() || isLoading) {
      console.log('Submission blocked:', isLoading ? 'loading in progress' : 'empty input');
      return;
    }
    
    if (isWelcomeScreen) {
      console.log('Exiting welcome screen');
      setIsWelcomeScreen(false);
    }
    
    // Add user message
    const newUserMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user'
    };
    
    console.log('Adding user message:', { id: newUserMessage.id });
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    const userQuery = inputValue;
    setInputValue('');
    
    // Fetch bot response
    console.log('Initiating bot response fetch');
    try {
      await fetchBotResponse(userQuery);
      console.log('Bot response fetch completed successfully');
    } catch (err) {
      console.error('Unhandled error in fetchBotResponse:', err);
    }
  };

  const handlePresetQuestion = async (question) => {
    console.log('Preset question selected:', question);
    
    if (isLoading) {
      console.log('Preset question blocked: loading in progress');
      return;
    }
    
    if (isWelcomeScreen) {
      console.log('Exiting welcome screen via preset question');
      setIsWelcomeScreen(false);
    }
    
    // Add user message
    const newUserMessage = {
      id: messages.length + 1,
      text: question,
      sender: 'user'
    };
    
    console.log('Adding preset question as user message:', { id: newUserMessage.id });
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setInputValue('');
    
    // Fetch bot response
    console.log('Initiating bot response fetch for preset question');
    try {
      await fetchBotResponse(question);
      console.log('Preset question bot response fetch completed successfully');
    } catch (err) {
      console.error('Unhandled error in fetchBotResponse for preset question:', err);
    }
  };

  const presetQuestions = [
    "What is Eigen Layer?",
    "What is the price of BTC?",
    "How do I buy BTC?",
    "What is the price of ETH?",
    "Who is Satoshi Nakamoto?",
    "What is HyperLiquid?",
    "How much is PEPE?"
  ];

  console.log('Rendering ChatInterface, mode:', isWelcomeScreen ? 'welcome screen' : 'chat view');
  
  return (
    <div className="chat-container">
      {isWelcomeScreen ? (
        <div className="welcome-screen">
          <h1 className="welcome-title">Yo, what's on your mind?</h1>
          <p className="welcome-subtitle">
            Choose one of the most common prompts or use your own
          </p>
          
          <form className="chat-input-container welcome-input" onSubmit={handleSubmit}>
            <input
              type="text"
              className="chat-input"
              placeholder="Ask anything..."
              value={inputValue}
              onChange={handleInputChange}
            />
            <button type="submit" className="send-button">
              →
            </button>
          </form>
          
          <div className="preset-questions">
            {presetQuestions.map((question, index) => (
              <button
                key={index}
                className="preset-question-button"
                onClick={() => handlePresetQuestion(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="chat-messages">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
              >
                {message.sender === 'user' && <div className="message-bubble user">{message.text}</div>}
                {message.sender === 'bot' && 
                  <div className="message-bubble bot">
                    {message.text.split('\n\n').map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                }
              </div>
            ))}
            {isLoading && (
              <div className="message bot-message">
                <div className="message-bubble bot loading">
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="chat-input-wrapper">
            <form className="chat-input-container" onSubmit={handleSubmit}>
              <input
                type="text"
                className="chat-input"
                placeholder="What is the price of BTC?"
                value={inputValue}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className={`send-button ${isLoading ? 'disabled' : ''}`}
                disabled={isLoading}
              >
                →
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatInterface;
