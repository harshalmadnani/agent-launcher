import React from 'react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <ul className="nav-list">
        <li className="nav-item active">
          <button className="nav-button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="nav-icon">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H4V4h16v12z" fill="currentColor"/>
            </svg>
            <span>Chat</span>
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="nav-icon">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V8h2v4z" fill="currentColor"/>
            </svg>
            <span>Agent Launcher</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar; 