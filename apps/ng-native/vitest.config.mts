import { ngNative } from "@ng-native/testing/vitest";
import { defineConfig } from "vitest/config";

// Compiles Angular the way Metro does for the app. Tests run in Node against a
// fake of the native side: no simulator, no device.
export default defineConfig({
  plugins: [ngNative()],
});
