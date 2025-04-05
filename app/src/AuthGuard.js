import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import './AuthGuard.css';

// This component can wrap any content that should only be accessible to authenticated users
const AuthGuard = ({ children }) => {
  const { authenticated, ready, user } = usePrivy();
  const [userVerified, setUserVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(null);
  const [userAddress, setUserAddress] = useState(null);

  useEffect(() => {
    const verifyUser = async () => {
      if (!authenticated || !user) {
        console.log('Auth status:', { authenticated, user: !!user });
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        console.log('Starting user verification process...');
        console.log('User object:', JSON.stringify(user, null, 2));
        
        // Try to get the Twitter username
        let twitterUsername = null;
        if (user.twitter?.username) {
          twitterUsername = user.twitter.username;
          console.log('Found Twitter username:', twitterUsername);
        } else if (user.twitter?.handle) {
          twitterUsername = user.twitter.handle;
          console.log('Found Twitter handle:', twitterUsername);
        }
        
        if (!twitterUsername) {
          console.error('No Twitter username found in user object');
          setError("Could not retrieve Twitter username. Please try logging in again.");
          setIsLoading(false);
          return;
        }

        // Remove @ symbol if present
        const cleanUsername = twitterUsername.replace(/^@/, '');
        console.log('Using clean username for API:', cleanUsername);
        
        setUsername(cleanUsername);
        
        // Check if user exists or create user in the backend
        console.log(`Checking if user exists: ${cleanUsername}`);
        const response = await fetch(`https://agent-launcher.onrender.com/user?username=${cleanUsername}`);
        console.log('User check response status:', response.status);
        
        let userData = null;
        if (!response.ok) {
          // If user doesn't exist, create one
          console.log(`User ${cleanUsername} not found, creating new user...`);
          const createResponse = await fetch('https://agent-launcher.onrender.com/user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: cleanUsername })
          });
          
          console.log('Create user response status:', createResponse.status);
          
          if (!createResponse.ok) {
            console.error('Failed to create user:', await createResponse.text());
            throw new Error('Failed to create user account');
          }
          
          const createData = await createResponse.json();
          userData = createData;
          console.log('User created successfully:', userData);
        } else {
          userData = await response.json();
          console.log('User verified successfully:', userData);
        }
        
        // Extract address from different possible response structures
        let address = null;
        
        if (userData && userData.address) {
          // Direct address in response
          address = userData.address;
          console.log('Found address directly in response:', address);
        } else if (userData && userData.data && userData.data.address) {
          // Address in data property
          address = userData.data.address;
          console.log('Found address in data property:', address);
        } else if (userData && userData.success && userData.address) {
          // Address with success flag
          address = userData.address;
          console.log('Found address with success flag:', address);
        }
        
        if (address) {
          console.log('Setting user address:', address);
          setUserAddress(address);
        } else {
          console.warn('No address found in user data:', userData);
        }
        
        setUserVerified(true);
        console.log('User verification complete');
      } catch (err) {
        console.error('Error verifying user:', err);
        setError('Failed to verify or create user account. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (authenticated && ready && user) {
      console.log('Authentication ready, verifying user...');
      verifyUser();
    } else {
      console.log('Waiting for authentication...', { ready, authenticated, hasUser: !!user });
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

  if (isLoading) {
    return <div className="loading">Verifying user account...</div>;
  }

  if (error) {
    return (
      <div className="auth-error">
        <h2>Authentication Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!userVerified) {
    return <div className="loading">Preparing your experience...</div>;
  }

  // Clone and pass username and address props to children
  return React.Children.map(children, child => {
    return React.cloneElement(child, { username, userAddress });
  });
};

export default AuthGuard; 