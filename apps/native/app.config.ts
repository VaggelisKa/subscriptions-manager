import type { ExpoConfig } from "@expo/config-types";

const config: ExpoConfig = {
  name: "Subscriptions Manager",
  slug: "subscriptions-manager",
  version: "1.0.0",
  scheme: "subscriptions-manager",
  platforms: ["ios", "android"],
  userInterfaceStyle: "automatic",
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
  extra: {
    eas: {
      projectId: "2ceff1cf-2cbe-4f0e-90c6-1e9f7bebb19e",
    },
  },
};

export default { expo: config };
