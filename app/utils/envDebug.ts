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

  /**
   * Mask anything that looks like a credential before it reaches a console.
   *
   * `expoConfig.extra` previously carried the Sanity API token verbatim into
   * device logs, which is how secrets end up in crash reports and screenshots.
   */
  const redact = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(redact);
    if (!value || typeof value !== 'object') return value;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => {
        const isSecret = /token|secret|key|password|credential/i.test(entryKey);
        return [entryKey, isSecret ? '🔒 redacted' : redact(entryValue)];
      }),
    );
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
    // `extra` is only present on the ExpoConfig branch of the union.
    expoConfigExtra: redact((expoConfig as any)?.extra),
  };

  console.log('🔍 Environment Debug Info:', JSON.stringify(debugInfo, null, 2));
  
  return debugInfo;
};

// Call this function during app initialization in development
if (__DEV__) {
  debugEnvironment();
}