import React, { useState, useEffect, useRef } from 'react';
import './Navbar.css';
import { usePrivy } from '@privy-io/react-auth';
import { QRCodeSVG } from 'qrcode.react';

const Navbar = () => {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const [userAddress, setUserAddress] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
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
            setUserAddress(address);
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
  }, [authenticated, user, ready]);

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
      <div className="auth-section">
        {!ready ? (
          <div className="loading-state">Loading...</div>
        ) : authenticated ? (
          <div className="user-info">
            <span className="user-name">{getUserDisplayName()}</span>
            {userAddress && (
              <>
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
              </>
            )}
            <button className="auth-button logout" onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <button className="auth-button login" onClick={login}>
            Login
          </button>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRCode && userAddress && (
        <div className="qr-modal-overlay">
          <div className="qr-modal" ref={qrModalRef}>
            <div className="qr-header">
              <h3>Deposit ETH on Base</h3>
              <button className="close-button" onClick={() => setShowQRCode(false)}>×</button>
            </div>
            <div className="qr-content">
              <QRCodeSVG 
                value={userAddress}
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"L"}
                includeMargin={false}
              />
              <div className="address-container">
                <p className="full-address">{userAddress}</p>
                <button className="copy-button" onClick={copyAddressToClipboard}>
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 