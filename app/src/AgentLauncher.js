import React, { useState } from 'react';
import axios from 'axios';
import './AgentLauncher.css';

function AgentLauncher() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    query: '',
    systemPrompt: '',
    interval: 2
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: name === 'interval' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      // Use timestamp as userId for now 
      const timestamp = Date.now().toString();
      
      const payload = {
        userId: timestamp,
        interval: formData.interval,
        query: formData.query,
        systemPrompt: formData.systemPrompt,
        // Add name and description to be stored on your backend if needed
        name: formData.name,
        description: formData.description
      };

      const response = await axios.post(
        'https://97m15gg62a.execute-api.ap-south-1.amazonaws.com/prod/create',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 60000 // 60 seconds timeout
        }
      );

      setMessage({ 
        text: `Agent "${formData.name}" created successfully!`, 
        type: 'success' 
      });
      console.log('API response:', response.data);
    } catch (error) {
      setMessage({ 
        text: `Error creating agent: ${error.response?.data?.message || error.message}`, 
        type: 'error' 
      });
      console.error('Error creating agent:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agent-launcher">
      <h2>Create New Agent</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Agent Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Give your agent a name"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="What does this agent do?"
            rows="2"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="query">Agent Task</label>
          <textarea
            id="query"
            name="query"
            value={formData.query}
            onChange={handleChange}
            required
            placeholder="What should the agent do? (e.g., 'What is Bitcoin?')"
            rows="3"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="systemPrompt">System Prompt</label>
          <textarea
            id="systemPrompt"
            name="systemPrompt"
            value={formData.systemPrompt}
            onChange={handleChange}
            required
            placeholder="Set the system prompt for the agent (e.g., 'You are a helpful assistant.')"
            rows="3"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="interval">Interval (hours)</label>
          <input
            type="number"
            id="interval"
            name="interval"
            value={formData.interval}
            onChange={handleChange}
            required
            min="1"
            max="24"
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Launch Agent'}
        </button>
      </form>
    </div>
  );
}

export default AgentLauncher;
