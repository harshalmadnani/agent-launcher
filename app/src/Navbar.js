import React, { useState, useEffect, useRef } from 'react';
import './Navbar.css';
import { usePrivy } from '@privy-io/react-auth';
import { QRCodeSVG } from 'qrcode.react';

const Navbar = ({ onNavigate, activeComponent, setUserAddress }) => {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const [userAddress, setLocalUserAddress] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const qrModalRef = useRef(null);
  
  // Fetch user address from backend when authenticated
  useEffect(() => {
    const fetchUserAddress = async () => {
      if (!authenticated || !user || !user.twitter) {
        console.log('Navbar: Not ready to fetch address:', { authenticated, hasUser: !!user, hasTwitter: !!user?.twitter });
        return;
      }
      
      try {
        console.log('Navbar: Fetching user address from backend');
        console.log('Navbar: User object:', JSON.stringify(user, null, 2));
        
        let username = null;
        if (user.twitter?.username) {
          username = user.twitter.username;
          console.log('Navbar: Using Twitter username:', username);
        } else if (user.twitter?.handle) {
          username = user.twitter.handle;
          console.log('Navbar: Using Twitter handle:', username);
        }
        
        if (!username) {
          console.error('Navbar: No Twitter username found in user object');
          return;
        }
        
        // Remove @ symbol if present
        const cleanUsername = username.replace(/^@/, '');
        console.log('Navbar: Using clean username for API:', cleanUsername);
        
        console.log(`Navbar: Fetching address for user: ${cleanUsername}`);
        const response = await fetch(`https://agent-launcher.onrender.com/user?username=${cleanUsername}`);
        console.log('Navbar: User fetch response status:', response.status);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Navbar: User data fetched:', userData);
          
          // Check for address in various possible response structures
          let address = null;
          
          if (userData && userData.address) {
            // Direct address in response
            address = userData.address;
            console.log('Navbar: Found address directly in response:', address);
          } else if (userData && userData.data && userData.data.address) {
            // Address in data property
            address = userData.data.address;
            console.log('Navbar: Found address in data property:', address);
          } else if (userData && userData.success && userData.address) {
            // Address with success flag
            address = userData.address;
            console.log('Navbar: Found address with success flag:', address);
          }
          
          if (address) {
            console.log('Navbar: Setting user address:', address);
            setLocalUserAddress(address);
            // Update the address in the parent component
            if (setUserAddress) {
              setUserAddress(address);
            }
          } else {
            console.warn('Navbar: No address found in user data:', userData);
          }
        } else {
          console.error('Navbar: Failed to fetch user data:', response.statusText);
        }
      } catch (error) {
        console.error('Navbar: Error fetching user address:', error);
      }
    };
    
    if (authenticated && ready && user) {
      console.log('Navbar: Authentication ready, fetching user address...');
      fetchUserAddress();
    }
  }, [authenticated, user, ready, setUserAddress]);

  // Close QR modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (qrModalRef.current && !qrModalRef.current.contains(event.target)) {
        setShowQRCode(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu when navigation item is clicked
  const handleNavigationClick = (component) => {
    onNavigate(component);
    setMobileMenuOpen(false);
  };

  // Get display name from Twitter or fall back to generic user
  const getUserDisplayName = () => {
    if (!user) return 'User';
    
    if (user.twitter?.username) return `@${user.twitter.username}`;
    if (user.twitter?.handle) return `@${user.twitter.handle}`;
    
    return 'User';
  };

  // Format wallet address to show only first 6 and last 4 characters
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Copy address to clipboard
  const copyAddressToClipboard = () => {
    if (!userAddress) return;
    
    navigator.clipboard.writeText(userAddress)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button 
        className="mobile-menu-button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {mobileMenuOpen ? (
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          ) : (
            <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          )}
        </svg>
      </button>
      
      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>
      
      <nav className={`navbar ${mobileMenuOpen ? 'open' : ''}`}>
        <ul className="nav-list">
          <li className={`nav-item ${activeComponent === 'chat' ? 'active' : ''}`}>
            <button className="nav-button" onClick={() => handleNavigationClick('chat')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="nav-icon">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H4V4h16v12z" fill="currentColor"/>
              </svg>
              <span>Chat</span>
            </button>
          </li>
          <li className={`nav-item ${activeComponent === 'agent' ? 'active' : ''}`}>
            <button className="nav-button" onClick={() => handleNavigationClick('agent')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="nav-icon">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V8h2v4z" fill="currentColor"/>
              </svg>
              <span>Agent Launcher</span>
            </button>
          </li>
          <li className={`nav-item ${activeComponent === 'terminal' ? 'active' : ''}`}>
            <button className="nav-button" onClick={() => handleNavigationClick('terminal')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="nav-icon">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z" fill="currentColor"/>
              </svg>
              <span>Terminal</span>
            </button>
          </li>
        </ul>
        <div className="auth-section">
          {!ready ? (
            <div className="loading-state">Loading authentication...</div>
          ) : authenticated ? (
            <div className="user-info">
              <span className="user-name">{getUserDisplayName()}</span>
              {userAddress && (
                <>
                  <div className="address-actions">
                    <span 
                      className="user-address clickable" 
                      onClick={copyAddressToClipboard}
                      title="Click to copy address"
                    >
                      {formatAddress(userAddress)}
                      {isCopied && <span className="copy-tooltip">Copied!</span>}
                    </span>
                    <button 
                      className="qr-button" 
                      onClick={() => setShowQRCode(true)}
                      title="Show QR Code"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="6" height="6" x="3" y="3" rx="1" />
                        <rect width="6" height="6" x="15" y="3" rx="1" />
                        <rect width="6" height="6" x="3" y="15" rx="1" />
                        <path d="M15 15h6v.01H15z" />
                        <path d="M15 21h.01v.01H15z" />
                        <path d="M21 15v6h-6" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
              <button 
                className="auth-button logout" 
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button className="auth-button login" onClick={login}>
              Login with Twitter
            </button>
          )}
        </div>
      </nav>
      
      {/* QR Code Modal */}
      {showQRCode && userAddress && (
        <div className="qr-modal-overlay">
          <div className="qr-modal" ref={qrModalRef}>
            <div className="qr-header">
              <h3>Wallet Address</h3>
              <button className="close-button" onClick={() => setShowQRCode(false)}>
                ×
              </button>
            </div>
            <div className="qr-content">
              <QRCodeSVG value={userAddress} size={200} />
              <div className="address-container">
                <div className="full-address">{userAddress}</div>
                <button className="copy-button" onClick={copyAddressToClipboard}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  {isCopied ? 'Copied!' : 'Copy Address'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar; 