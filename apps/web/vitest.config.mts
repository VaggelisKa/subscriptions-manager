import { defineConfig } from "vitest/config";

// Resolves tsconfig `paths` (e.g. `@supabase-functions/*`) the same way Next does.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
