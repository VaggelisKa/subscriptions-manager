import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Expo's tsconfig extends `expo/tsconfig.base`, which Vite can't resolve; these tests need none of it.
  oxc: { tsconfig: false },
  // The app's `@/…` imports (tsconfig `paths`).
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
