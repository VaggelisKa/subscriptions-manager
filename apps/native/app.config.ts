import type { ExpoConfig } from '@expo/config-types';

const config: ExpoConfig = {
  name: "Subscriptions Manager",
  slug: "subscriptions-manager",
  version: "1.0.0",
  scheme: "subscriptions-manager",
  platforms: ["ios", "android"],
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    backgroundColor: "#ffffff",
  },
  ios: {
    bundleIdentifier: "com.subscriptionsmanager.app",
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#ffffff",
    },
    package: "com.subscriptionsmanager.app",
  },
  experiments: {
    typedRoutes: true,
  },
  plugins: ["expo-router"],
};

export default { expo: config };
