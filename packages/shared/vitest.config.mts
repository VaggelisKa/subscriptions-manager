import { defineConfig } from "vitest/config";

// The schedule maths reads days in Copenhagen. Running in that zone makes the
// DST cases real (a weekly charge across the last Sunday of March/October).
process.env.TZ = "Europe/Copenhagen";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
