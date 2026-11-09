const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

module.exports = {
  expo: {
    name: IS_DEV
      ? "Tunisiska Mega (Dev)"
      : IS_PREVIEW
        ? "Tunisiska Mega (Preview)"
        : "Tunisiska Mega",
    slug: "tunisiska-mega-service",
    display: "standalone",
    description:
      "Tunisiska Mega Service is a mobile app for booking and managing services.",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./app/assets/expo-icons/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./app/assets/expo-icons/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      requireFullScreen: true,
      bundleIdentifier: IS_DEV
        ? "com.alcatrazdev.tunisiskaservices.dev"
        : IS_PREVIEW
          ? "com.alcatrazdev.tunisiskaservices.preview"
          : "com.alcatrazdev.tunisiskaservices",
      infoPlist: {
        CFBundleDisplayName: IS_DEV
          ? "Tunisiska Mega Dev"
          : IS_PREVIEW
            ? "Tunisiska Mega Preview"
            : "Tunis Mega",
        // Photo library permission for media uploads
        NSPhotoLibraryUsageDescription:
          "This app needs access to your photo library so you can upload photos of your shipments, damaged packages, or other items related to your service bookings. For example, you may need to attach a photo to prove the condition of a package during a shipping dispute.",
        // Sign in with Apple for privacy-focused authentication
        ASAuthorizationAppleIDProvider: true,
        UNUserNotificationCenter: {
          UNAuthorizationStatusAuthorized: true,
        },
        // Add permission for notifications and badge
        NSUserNotificationsUsageDescription:
          "This app uses notifications to keep you updated on your service bookings and important announcements.",
        // Enable badge updates
        "com.apple.developer.usernotifications.communication": true,
        ITSAppUsesNonExemptEncryption: false,
        // Location permissions for map functionality
        NSLocationWhenInUseUsageDescription:
          "This app uses location services to show shipping routes and driver locations on the map.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "This app uses location services to track shipping deliveries and provide real-time updates.",
        NSLocationAlwaysUsageDescription:
          "This app uses location services in the background to track shipping deliveries and provide real-time updates.",
        NSFaceIDUsageDescription:
          "Allows App to use Face ID for a simpler sign in.",
        // Add URL schemes for Stripe redirect
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ["tunisiska-mega-service"],
          },
        ],
      },
      config: {
        googleMaps: {
          apiKey: "AIzaSyD15X03HjphQz3p4GLrooYrIKsBxcxW4s0",
        },
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./app/assets/expo-icons/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: IS_DEV
        ? "com.alcatrazdev.tunisiskaservices.dev"
        : IS_PREVIEW
          ? "com.alcatrazdev.tunisiskaservices.preview"
          : "com.alcatrazdev.tunisiskaservices",
      permissions: [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "WAKE_LOCK",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "FOREGROUND_SERVICE",
      ],
      intentFilters: [
        {
          action: "VIEW",
          data: [
            {
              scheme: "tunisiska-mega-service",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
      config: {
        googleMaps: {
          apiKey: "AIzaSyD15X03HjphQz3p4GLrooYrIKsBxcxW4s0",
        },
      },
    },
    web: {
      bundler: "metro",
      // Single-page output: the web build is a client-rendered app. Static
      // per-route rendering runs through Expo Router 58's server route registry,
      // which fails on this project's non-route files under `app/`.
      output: "single",
      favicon: "./app/assets/expo-icons/favicon.png",
    },
    scheme: "tunisiska-mega-service",
    plugins: [
      [
        "expo-router",
        {
          origin:
            process.env.NODE_ENV === "development"
              ? "http://192.168.8.106:3000"
              : "https://tunisiska-services-app.expo.app",
        },
      ],
      "expo-secure-store",
      "expo-font",
      "expo-web-browser",
      [
        "expo-video",
        {
          supportsBackgroundPlayback: false,
          supportsPictureInPicture: false,
        },
      ],
      [
        "expo-splash-screen",
        {
          backgroundColor: "#ffffff",
          image: "./app/assets/expo-icons/splash-icon.png",
          dark: {
            image: "./app/assets/expo-icons/splash-icon.png",
            backgroundColor: "#ffffff",
          },
          imageWidth: 200,
        },
      ],
      "expo-localization",
      [
        "expo-build-properties",
        {
          ios: { deploymentTarget: "16.4" },
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./app/assets/expo-icons/icon.png",
          color: "#ffffff",
          defaultChannel: "default",
          enableBackgroundRemoteNotifications: false,
          iosDisplayInForeground: true,
          mode: IS_DEV ? "development" : "production",
          ios: {
            icon: "./app/assets/expo-icons/icon.png",
          },
          android: {
            icon: "./app/assets/expo-icons/icon.png",
            color: "#ffffff",
            largeIcon: "./app/assets/expo-icons/icon.png",
          },
        },
      ],
      "expo-maps",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow $(PRODUCT_NAME) to use your location.",
        },
      ],
      "@react-native-google-signin/google-signin",
      "./plugins/withAudioBackgroundFix",
      "./plugins/withKlarnaRepo",
      // Makes a clean prebuild produce a buildable Podfile (modular headers
      // for the Google Sign-in pods, and pod deployment targets Xcode accepts).
      "./plugins/withPodfileFixes",
      // Live Activities Widget extension requires manual provisioning profile and App Group
      // setup in developer.apple.com before it can be signed for App Store distribution.
      // "./plugins/withLiveActivities",
    ],

    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "febc1a59-7c3b-4754-a888-3246bca56018",
      },
      // Expose Sanity config so it's available at runtime on device/web.
      // The API token is deliberately NOT exposed here: a second copy in the
      // build manifest only widens the leak. See `sanityClient.ts` for the
      // remaining client token, which must move server-side before release.
      sanity: {
        projectId: process.env.EXPO_PUBLIC_SANITY_PROJECT_ID,
        dataset: process.env.EXPO_PUBLIC_SANITY_DATASET,
      },
      // Environment variables for different build types
      env: process.env.APP_VARIANT || "production",
      isDev: IS_DEV,
      isPreview: IS_PREVIEW,
      // API configuration
      apiOrigin:
        process.env.NODE_ENV === "development"
          ? process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:3000"
          : "https://tunisiska-services-app.expo.app",
      // Add server configuration for real devices
      serverUrl:
        process.env.NODE_ENV === "development"
          ? process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:3000"
          : "https://tunisiska-services-app.expo.app",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/febc1a59-7c3b-4754-a888-3246bca56018",
    },
    owner: "alcatrazdev",
  },
};
