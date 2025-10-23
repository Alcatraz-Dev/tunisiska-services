// Stripe configuration for the app
// This file contains the Stripe keys and configuration

import { getServerURL as getDynamicServerURL } from '../lib/getServerURL';

export const STRIPE_CONFIG = {
  // Use environment variables for Stripe keys (required for production)
  publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  secretKey: process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY!,

  // Merchant configuration
  merchantDisplayName: 'Tunisiska Mega Service',
  merchantIdentifier: 'merchant.com.tunisiska.services', // Required for iOS Apple Pay
  returnURL: 'tunisiska-mega-services://stripe-redirect',

  // Payment configuration
  currency: 'sek',
  allowsDelayedPaymentMethods: true,

  // UI configuration
  appearance: {
    colors: {
      primary: '#667eea',
    },
  },
};

// Helper function to get the correct server URL based on environment
export const getServerURL = () => {
  // Priority 1: Environment variable (recommended for real devices and production)
  const envServerUrl = process.env.EXPO_PUBLIC_SERVER_URL;
  if (envServerUrl) {
    return envServerUrl;
  }

  // Priority 2: Production server URL for deployed apps
  if (!__DEV__) {
    return PRODUCTION_SERVER_URL;
  }

  // Priority 3: Dynamic detection for development on real devices
  const dynamicUrl = getDynamicServerURL();
  if (dynamicUrl) {
    return dynamicUrl;
  }

  // Priority 4: Default localhost for development
  return 'http://localhost:3000';
};

// Production server URL (deployed to Vercel)
export const PRODUCTION_SERVER_URL = 'https://tunisiska-services.vercel.app';

// Helper function to check if server is reachable
export const checkServerHealth = async (url: string): Promise<boolean> => {
  try {
    // Create a promise that rejects after 5 seconds
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 5000);
    });
    
    const fetchPromise = fetch(`${url}/health`, {
      method: 'GET',
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    return response.ok;
  } catch (error) {
    console.warn('Server health check failed:', error);
    return false;
  }
};

// Get the best available server URL
export const getBestServerURL = async (): Promise<string> => {
  const primaryUrl = await getServerURL();

  // Check if primary URL is reachable
  if (await checkServerHealth(primaryUrl)) {
    return primaryUrl;
  }

  // For real devices, suggest setting EXPO_PUBLIC_SERVER_URL
  console.warn(`Server not reachable at ${primaryUrl}. For real devices, set EXPO_PUBLIC_SERVER_URL to your computer's local IP address (e.g., http://192.168.1.100:3000)`);
  return primaryUrl;
};

// Helper function to create mock payment data for testing
export const createMockPaymentData = (amount: number) => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  return {
    paymentIntent: `pi_mock_${randomId}_secret_${randomId}`,
    ephemeralKey: `ek_mock_${randomId}_secret_${randomId}`,
    customer: `cus_mock_${randomId}`,
    publishableKey: STRIPE_CONFIG.publishableKey,
    amount: amount,
    currency: STRIPE_CONFIG.currency,
  };
};

