import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

// This component can wrap any content that should only be accessible to authenticated users
const AuthGuard = ({ children, fallback }) => {
  const { authenticated, ready } = usePrivy();

  if (!ready) {
    // Privy is still initializing
    return <div className="loading">Loading...</div>;
  }

  if (!authenticated) {
    // User is not authenticated, return the fallback component or a default message
    return fallback || (
      <div className="auth-required">
        <h2>Authentication Required</h2>
        <p>Please log in to access this content.</p>
      </div>
    );
  }

  // User is authenticated, render the children
  return children;
};

export default AuthGuard; 