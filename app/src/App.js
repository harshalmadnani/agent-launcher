import './App.css';
import ChatInterface from './ChatInterface';
import AgentLauncher from './AgentLauncher';
import Navbar from './Navbar';
import { PrivyProvider } from '@privy-io/react-auth';
import AuthGuard from './AuthGuard';
import { useState } from 'react';

function App() {
  // Replace with your actual Privy app ID from your Privy dashboard
  const privyAppId = 'cm2flh2td04ih2tqbk42z7nsz';
  const [activeComponent, setActiveComponent] = useState('chat'); // 'chat' or 'agent'

  const handleNavigation = (component) => {
    setActiveComponent(component);
  };

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['twitter'],
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
        },
      }}
    >
      <div className="App">
        <div className="app-container">
          <Navbar onNavigate={handleNavigation} activeComponent={activeComponent} />
          <main className="main-content">
            <AuthGuard>
              {activeComponent === 'chat' ? <ChatInterface /> : <AgentLauncher />}
            </AuthGuard>
          </main>
        </div>
      </div>
    </PrivyProvider>
  );
}

export default App;
