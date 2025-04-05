import React, { useState, useRef, useEffect } from 'react';
import { 
  TextField, 
  IconButton, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Box,
  Paper
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { createClient } from '@supabase/supabase-js';
import { styled } from '@mui/material/styles';

const supabaseUrl = 'https://wbsnlpviggcnwqfyfobh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic25scHZpZ2djbndxZnlmb2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODc2NTcwNiwiZXhwIjoyMDU0MzQxNzA2fQ.tr6PqbiAXQYSQSpG2wS6I4DZfV1Gc3dLXYhKwBrJLS0';
const supabase = createClient(supabaseUrl, supabaseKey);

const TerminalContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#000',
  color: '#fff',
  padding: theme.spacing(2),
}));

const TerminalOutput = styled(Paper)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(2),
  overflowY: 'auto',
  fontFamily: 'monospace',
  fontSize: '14px',
  backgroundColor: '#000',
  lineHeight: '1.8',
  border: '1px solid #333',
  borderRadius: '4px',
  color: '#fff',
}));

const MessageContainer = styled('div')(({ theme }) => ({
  color: '#fff',
  marginBottom: theme.spacing(2),
}));

const AgentName = styled('span')(({ theme }) => ({
  color: '#64ff64',
}));

const Timestamp = styled('span')(({ theme }) => ({
  color: '#666',
  marginLeft: theme.spacing(1),
  fontSize: '12px',
}));

function Terminal() {
  const [history, setHistory] = useState([]);
  const [agentTweets, setAgentTweets] = useState([]);
  const [agentNames, setAgentNames] = useState({});
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const terminalRef = useRef(null);

  useEffect(() => {
    fetchAgents();
    fetchAgentNames();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      fetchMessages();
    }
  }, [selectedAgent]);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents2')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setAgents(data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchAgentNames = async () => {
    try {
      const { data, error } = await supabase
        .from('agents2')
        .select('id, name');
      
      if (error) throw error;
      
      const namesMap = {};
      data.forEach(agent => {
        namesMap[agent.id] = agent.name;
      });
      setAgentNames(namesMap);
    } catch (error) {
      console.error('Error fetching agent names:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedAgent) return;

    const { data: agentsData, error: agentsError } = await supabase
      .from('terminal2')
      .select('agent_id, tweet_content, created_at')
      .eq('agent_id', selectedAgent)
      .order('created_at', { ascending: false });

    if (agentsError) {
      console.error('Error fetching messages:', agentsError);
      return;
    }

    if (agentsData) {
      const messages = agentsData.map(item => ({
        type: 'output',
        agentId: item.agent_id,
        content: item.tweet_content,
        timestamp: new Date(item.created_at)
      }));
      setAgentTweets(messages);
      setHistory(messages);
    }
  };

  return (
    <TerminalContainer>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="agent-select-label" sx={{ color: '#fff' }}>Select Agent</InputLabel>
        <Select
          labelId="agent-select-label"
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          sx={{ 
            color: '#fff',
            backgroundColor: '#1a1a1a',
            '& .MuiSelect-icon': {
              color: '#fff'
            }
          }}
        >
          {agents.map((agent) => (
            <MenuItem key={agent.id} value={agent.id}>
              {agent.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TerminalOutput ref={terminalRef}>
        {history.map((entry, index) => (
          <MessageContainer key={index}>
            <AgentName>
              {entry.type === 'input' ? '> ' : `${agentNames[entry.agentId] || `Agent ${entry.agentId}`}: `}
            </AgentName>
            {entry.content}
            {entry.timestamp && (
              <Timestamp>
                {entry.timestamp.toLocaleString()}
              </Timestamp>
            )}
          </MessageContainer>
        ))}
      </TerminalOutput>
    </TerminalContainer>
  );
}

export default Terminal;
