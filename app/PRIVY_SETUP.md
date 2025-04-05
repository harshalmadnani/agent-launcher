# Setting Up Privy Authentication

This guide will walk you through setting up Privy authentication in your application.

## 1. Create a Privy Account

1. Go to [Privy Dashboard](https://console.privy.io/) and sign up for an account
2. Create a new app in the Privy dashboard

## 2. Get Your App ID

1. In the Privy dashboard, navigate to your app
2. Find your App ID in the app settings

## 3. Configure Your App

1. Open `src/App.js` in your project
2. Replace `YOUR_PRIVY_APP_ID` with the actual App ID from your Privy dashboard:

```javascript
const privyAppId = 'YOUR_PRIVY_APP_ID'; // Replace with your actual Privy App ID
```

## 4. Customization Options

You can customize the Privy integration by modifying the config options in `App.js`:

```javascript
config={{
  loginMethods: ['email', 'wallet', 'discord', 'google'], // Available options: 'email', 'wallet', 'discord', 'google', etc.
  appearance: {
    theme: 'dark', // or 'light'
    accentColor: '#676FFF', // Your preferred accent color
  },
}}
```

## 5. Handling Package Dependencies

If you encounter dependency conflicts with TypeScript versions, use the following commands to fix them:

```bash
# Remove existing node_modules and package-lock
rm -rf node_modules package-lock.json

# Install TypeScript 4.9.5 (for compatibility with React Scripts)
npm install --save typescript@4.9.5

# Install all dependencies with legacy peer deps flag
npm install --legacy-peer-deps
```

## 6. Using Authentication in Your App

- The `Navbar` component already includes login/logout functionality
- Use the `AuthGuard` component to protect content that requires authentication:

```javascript
import AuthGuard from './AuthGuard';

// Inside your component:
<AuthGuard>
  {/* Content only visible to authenticated users */}
</AuthGuard>
```

## 7. Additional Privy Features

Privy offers additional features you can integrate:
- User wallet management
- Self-custodial embedded wallets
- Multi-chain support
- And more...

For more information, refer to the [Privy documentation](https://docs.privy.io/). 