import './App.css';
import ChatInterface from './ChatInterface';
import AgentLauncher from './AgentLauncher';
import Terminal from './terminal';
import Navbar from './Navbar';
import { PrivyProvider } from '@privy-io/react-auth';
import AuthGuard from './AuthGuard';
import { useState, useEffect } from 'react';

function App() {
  // Replace with your actual Privy app ID from your Privy dashboard
  const privyAppId = 'cm2flh2td04ih2tqbk42z7nsz';
  const [activeComponent, setActiveComponent] = useState('chat'); // 'chat', 'agent', or 'terminal'
  const [userAddress, setUserAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Add smooth transitions when switching components
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [activeComponent]);

  const handleNavigation = (component) => {
    setActiveComponent(component);
  };

  // Render the active component with transition effects
  const renderActiveComponent = () => {
    if (isLoading) {
      return <div className="component-loading">
        <div className="loading-spinner"></div>
      </div>;
    }

    switch (activeComponent) {
      case 'chat':
        return <ChatInterface userAddress={userAddress} />;
      case 'agent':
        return <AgentLauncher />;
      case 'terminal':
        return <Terminal />;
      default:
        return <ChatInterface userAddress={userAddress} />;
    }
  };

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['twitter'],
        appearance: {
          theme: 'dark',
          accentColor: 'var(--primary-color)',
          logo: 'https://place-hold.it/120x40/5D5FEF/FFFFFF&text=AgentLauncher',
          modalBackdrop: 'blur',
        },
      }}
    >
      <div className="App">
        <div className="app-container">
          <Navbar 
            onNavigate={handleNavigation} 
            activeComponent={activeComponent} 
            setUserAddress={setUserAddress}
          />
          <main className="main-content">
            <AuthGuard>
              <div className={`component-container fade-${isLoading ? 'exit' : 'enter'}-active`}>
                {renderActiveComponent()}
              </div>
            </AuthGuard>
          </main>
        </div>
      </div>
    </PrivyProvider>
  );
}

export default App;
