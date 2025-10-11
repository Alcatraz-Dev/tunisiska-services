# Stripe Network Error Troubleshooting Guide

## Common Issues and Solutions

### 0. Expo Go Limitation
**Error**: Payment not working on real devices with Expo Go

**Solution**: Expo Go does not support custom native modules like `@stripe/stripe-react-native`. To test payments on real devices, you must create a development build:

```bash
# Install EAS CLI (if not already installed)
npm install -g eas-cli

# Login to Expo (if not already logged in)
npx eas login

# Build development version for Android
npx eas build --profile development --platform android

# Or for iOS (requires Apple Developer account)
npx eas build --profile development --platform ios
```

After the build completes, download and install the APK/IPA on your device. Then run:
```bash
npx expo start --dev-client
```

This will allow you to test with full native functionality including Stripe payments.

### 1. Server Not Running
**Error**: `Network request failed` or `Server not reachable`

**Solution**:
```bash
# Check if server is running
npm run server:check

# Start the server
npm run server

# Or start simple server
npm run server:simple
```

### 2. Wrong Server URL
**Error**: `Failed to initialize payment sheet`

**Solution**: 
- Check your `.env.local` file has the correct `EXPO_PUBLIC_SERVER_URL`
- For development: `http://localhost:3000`
- For device testing: `http://YOUR_IP:3000` (replace YOUR_IP with your computer's IP)

### 3. Invalid Stripe Keys
**Error**: `Invalid API key provided`

**Solution**:
- Verify your Stripe keys in `.env.local`:
  - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_test_`)
  - `EXPO_PUBLIC_STRIPE_SECRET_KEY` (starts with `sk_test_`)
- Make sure they're from the same Stripe account
- Ensure they're test keys, not live keys

### 4. Amount Conversion Issues
**Error**: Payment amounts incorrect

**Solution**: 
- The app now automatically converts amounts to the smallest currency unit (öre for SEK)
- 49 SEK = 4900 öre in Stripe

### 5. Environment Variables Not Loading
**Error**: Server starts but can't process payments

**Solution**:
```bash
# Make sure your .env.local file exists and contains:
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
EXPO_PUBLIC_STRIPE_SECRET_KEY=sk_test_your_key_here
EXPO_PUBLIC_SERVER_URL=http://localhost:3000
```

## Network Configuration

### For Development (same computer)
```env
EXPO_PUBLIC_SERVER_URL=http://localhost:3000
```

### For Device Testing (phone/simulator on same network)
```env
EXPO_PUBLIC_SERVER_URL=http://192.168.X.X:3000
```
Replace `192.168.X.X` with your computer's local IP address.

### Find Your Local IP Address

**macOS/Linux**:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows**:
```cmd
ipconfig | findstr "IPv4"
```

## Debugging Steps

1. **Check server health**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check environment variables**:
   ```bash
   cat .env.local
   ```

3. **Test payment endpoint**:
   ```bash
   curl -X POST http://localhost:3000/payment-sheet \
     -H "Content-Type: application/json" \
     -d '{"amount":49,"currency":"sek"}'
   ```

4. **Check React Native logs**:
   - Look for console.log messages in Metro bundler
   - Check for network errors in device/simulator logs

## Fixed Issues

✅ **Server URL Detection**: App now automatically finds the best available server URL
✅ **Amount Conversion**: Fixed Stripe amount conversion (SEK to öre)
✅ **Error Handling**: Improved error messages in Swedish
✅ **Environment Variables**: Proper loading of Stripe configuration
✅ **Network Timeouts**: Added proper timeout handling for React Native
✅ **Fallback URLs**: Multiple server URL attempts for better connectivity

## Support

If you're still experiencing issues:
1. Check the console logs in your development environment
2. Verify your Stripe test keys are valid
3. Ensure your server is accessible from your test device
4. Make sure your internet connection is stable

## Quick Fix Commands

```bash
# Kill any existing server processes
pkill -f "node server"

# Start fresh server
npm run server

# Check server is working
npm run server:check

# Restart your Expo development server
npx expo start --clear
```