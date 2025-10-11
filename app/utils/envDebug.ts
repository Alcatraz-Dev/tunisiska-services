import Constants from 'expo-constants';

export const debugEnvironment = () => {
  const isDev = __DEV__;
  const expoConfig = Constants.expoConfig || Constants.manifest;
  
  const envVars = {
    EXPO_PUBLIC_SANITY_PROJECT_ID: process.env.EXPO_PUBLIC_SANITY_PROJECT_ID,
    EXPO_PUBLIC_SANITY_DATASET: process.env.EXPO_PUBLIC_SANITY_DATASET, 
    EXPO_PUBLIC_SANITY_TOKEN: process.env.EXPO_PUBLIC_SANITY_TOKEN ? '✅ Set' : '❌ Missing',
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing',
    NODE_ENV: process.env.NODE_ENV,
    APP_VARIANT: process.env.APP_VARIANT,
  };

  const debugInfo = {
    isDev,
    platform: Constants.platform,
    expoVersion: Constants.expoVersion,
    appVersion: Constants.expoConfig?.version,
    buildVersion: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode,
    executionEnvironment: Constants.executionEnvironment,
    appOwnership: Constants.appOwnership,
    envVars,
    expoConfigExtra: expoConfig?.extra,
  };

  console.log('🔍 Environment Debug Info:', JSON.stringify(debugInfo, null, 2));
  
  return debugInfo;
};

// Call this function during app initialization in development
if (__DEV__) {
  debugEnvironment();
}