import React, { useState, useRef, useEffect } from 'react';
import { 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Box,
  Paper
} from '@mui/material';
import { createClient } from '@supabase/supabase-js';
import { styled } from '@mui/material/styles';

const supabaseUrl = 'https://wbsnlpviggcnwqfyfobh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic25scHZpZ2djbndxZnlmb2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODc2NTcwNiwiZXhwIjoyMDU0MzQxNzA2fQ.tr6PqbiAXQYSQSpG2wS6I4DZfV1Gc3dLXYhKwBrJLS0';
const supabase = createClient(supabaseUrl, supabaseKey);

const TerminalContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  width: '100%',
  backgroundColor: '#000',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
paddingTop:'5%'
}));

const TerminalOutput = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  overflowY: 'auto',
  fontFamily: 'JetBrains Mono, Consolas, monospace',
  fontSize: '14px',
  backgroundColor: '#1A1A1A',
  lineHeight: '1.6',
  border: '1px solid #333',
  borderRadius: theme.spacing(1),
  color: '#fff',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  flex: 1,
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#1A1A1A',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#333',
    borderRadius: '4px',
    '&:hover': {
      background: '#444',
    },
  },
}));

const MessageContainer = styled('div')(({ theme }) => ({
  color: '#fff',
  marginBottom: theme.spacing(1.5),
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderRadius: theme.spacing(0.5),
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
}));

const AgentName = styled('span')(({ theme }) => ({
  color: '#00FF9C',
  fontWeight: 500,
  marginRight: theme.spacing(1),
}));

const Timestamp = styled('span')(({ theme }) => ({
  color: '#666',
  marginLeft: theme.spacing(1),
  fontSize: '12px',
  opacity: 0.8,
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
      <FormControl variant="outlined" size="small">
        <InputLabel id="agent-select-label" sx={{ color: '#aaa' }}>Select Agent</InputLabel>
        <Select
          labelId="agent-select-label"
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          sx={{ 
            color: '#fff',
            backgroundColor: '#1E1E1E',
            width: '100%',
            height: '100%',
            borderRadius: 1,
            '& .MuiSelect-icon': {
              color: '#00FF9C'
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#333',
              borderWidth: '1px',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#00FF9C',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#00FF9C',
              borderWidth: '1px',
            },
            '& .MuiList-root': {
              backgroundColor: '#1E1E1E',
            },
            '& .MuiPaper-root': {
              backgroundColor: '#1E1E1E',
            }
          }}
        >
          <MenuItem value="" disabled>
            <em style={{ color: '#666' }}>Select an agent</em>
          </MenuItem>
          {agents.map((agent) => (
            <MenuItem 
              key={agent.id} 
              value={agent.id}
              sx={{
                color: '#fff',
                backgroundColor: '#1E1E1E',
                '&:hover': {
                  backgroundColor: '#2C2C2C',
                },
                '&.Mui-selected': {
                  backgroundColor: '#383838',
                  '&:hover': {
                    backgroundColor: '#404040',
                  }
                }
              }}
            >
              {agent.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TerminalOutput ref={terminalRef}>
        {history.length === 0 ? (
          <MessageContainer style={{ textAlign: 'center', color: '#666' }}>
            Select an agent to view their messages
          </MessageContainer>
        ) : (
          history.map((entry, index) => (
            <MessageContainer key={index}>
              <AgentName>
                {entry.type === 'input' ? '> ' : `${agentNames[entry.agentId] || `Agent ${entry.agentId}`}: `}
              </AgentName>
              <span style={{ wordBreak: 'break-word' }}>{entry.content}</span>
              {entry.timestamp && (
                <Timestamp>
                  {entry.timestamp.toLocaleString()}
                </Timestamp>
              )}
            </MessageContainer>
          ))
        )}
      </TerminalOutput>
    </TerminalContainer>
  );
}

export default Terminal;
