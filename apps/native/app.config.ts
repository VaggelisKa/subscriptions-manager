import type { ExpoConfig } from "@expo/config-types";

const config: ExpoConfig = {
  name: "Subscriptions Manager",
  slug: "subscriptions-manager",
  version: "1.0.0",
  scheme: "subscriptions-manager",
  platforms: ["ios", "android"],
  userInterfaceStyle: "automatic",
  icon: "./assets/app-icon.jpg",
  splash: {
    backgroundColor: "#ffffff",
  },
  ios: {
    bundleIdentifier: "com.subscriptionsmanager.app",
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/app-icon.jpg",
      backgroundColor: "#ffffff",
    },
    package: "com.subscriptionsmanager.app",
  },
  experiments: {
    typedRoutes: true,
  },
  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        ios: {
          buildReactNativeFromSource: true,
          useHermesV1: true,
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "2ceff1cf-2cbe-4f0e-90c6-1e9f7bebb19e",
    },
  },
  updates: {
    url: "https://u.expo.dev/2ceff1cf-2cbe-4f0e-90c6-1e9f7bebb19e",
    enableBsdiffPatchSupport: true,
  },
  runtimeVersion: {
    policy: "appVersion",
  },
};

export default { expo: config };
