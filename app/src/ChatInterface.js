import { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';

const ChatInterface = () => {
  const [inputValue, setInputValue] = useState('');
  const [isWelcomeScreen, setIsWelcomeScreen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
    setIsLoading(true);
    try {
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

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      // Add bot response
      const botMessage = {
        id: messages.length + 2,
        text: data.response || "Sorry, I couldn't process your request. Please try again.",
        sender: 'bot'
      };
      
      setMessages(prevMessages => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error fetching response:', error);
      
      // Add error message
      const errorMessage = {
        id: messages.length + 2,
        text: "Sorry, I encountered an error processing your request. Please try again later.",
        sender: 'bot'
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    if (isWelcomeScreen) {
      setIsWelcomeScreen(false);
    }
    
    // Add user message
    const newUserMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user'
    };
    
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    const userQuery = inputValue;
    setInputValue('');
    
    // Fetch bot response
    await fetchBotResponse(userQuery);
  };

  const handlePresetQuestion = async (question) => {
    if (isLoading) return;
    
    if (isWelcomeScreen) {
      setIsWelcomeScreen(false);
    }
    
    // Add user message
    const newUserMessage = {
      id: messages.length + 1,
      text: question,
      sender: 'user'
    };
    
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setInputValue('');
    
    // Fetch bot response
    await fetchBotResponse(question);
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
