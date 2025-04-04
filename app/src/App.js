import './App.css';
import ChatInterface from './ChatInterface';
import Navbar from './Navbar';

function App() {
  return (
    <div className="App">
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <ChatInterface />
        </main>
      </div>
    </div>
  );
}

export default App;
