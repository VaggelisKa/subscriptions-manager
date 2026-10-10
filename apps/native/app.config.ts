import type { ExpoConfig } from "@expo/config-types";

const config: ExpoConfig = {
  name: "Subscriptions Manager",
  slug: "subscriptions-manager",
  version: "1.0.0",
  scheme: "subscriptions-manager",
  platforms: ["ios", "android", "web"],
  userInterfaceStyle: "automatic",
  icon: "./assets/app-icon.jpg",
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
  web: {
    bundler: "metro",
    output: "single",
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  plugins: [
    "expo-router",
    ["expo-splash-screen", { backgroundColor: "#ffffff" }],
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
