import './App.css';
import ChatInterface from './ChatInterface';
import Navbar from './Navbar';
import { PrivyProvider } from '@privy-io/react-auth';
import AuthGuard from './AuthGuard';

function App() {
  // Replace with your actual Privy app ID from your Privy dashboard
  const privyAppId = 'cm2flh2td04ih2tqbk42z7nsz';

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
          <Navbar />
          <main className="main-content">
            <AuthGuard>
              <ChatInterface />
            </AuthGuard>
          </main>
        </div>
      </div>
    </PrivyProvider>
  );
}

export default App;
