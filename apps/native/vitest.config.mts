import { defineConfig } from "vitest/config";

export default defineConfig({
  // Expo's tsconfig extends `expo/tsconfig.base`, which Vite can't resolve; these tests need none of it.
  oxc: { tsconfig: false },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
