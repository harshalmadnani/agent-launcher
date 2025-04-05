import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import './AuthGuard.css';

// This component can wrap any content that should only be accessible to authenticated users
const AuthGuard = ({ children }) => {
  const { authenticated, ready, user } = usePrivy();
  const [username, setUsername] = useState(null);
  const [userAddress, setUserAddress] = useState(null);

  useEffect(() => {
    if (authenticated && ready && user) {
      // Try to get the Twitter username
      let twitterUsername = null;
      if (user.twitter?.username) {
        twitterUsername = user.twitter.username;
      } else if (user.twitter?.handle) {
        twitterUsername = user.twitter.handle;
      }
      
      // Remove @ symbol if present
      if (twitterUsername) {
        const cleanUsername = twitterUsername.replace(/^@/, '');
        setUsername(cleanUsername);
      }
    }
  }, [authenticated, ready, user]);

  if (!ready) {
    return <div className="loading">Loading authentication...</div>;
  }

  if (!authenticated) {
    return (
      <div className="auth-required">
        <h2>Authentication Required</h2>
        <p>Please log in with Twitter to access this application.</p>
      </div>
    );
  }

  // Clone and pass username and address props to children
  return React.Children.map(children, child => {
    return React.cloneElement(child, { username, userAddress });
  });
};

export default AuthGuard; 