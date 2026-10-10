import path from "node:path";
import { defineConfig } from "@playwright/test";
import { APP_PORT, BASE_URL, SHOTS_DIR } from "./support";

/**
 * Auth flows against the Expo web export (spec §9.2–9.5), the local stack and Mailpit. Run it
 * through run.sh. Own port, own export: it can run beside the parity suite.
 */
export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  retries: 0,
  // Every test makes its own throwaway user.
  workers: 2,
  timeout: 60_000,
  forbidOnly: true,
  reporter: [["list"]],
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    locale: "en-DK",
    timezoneId: "Europe/Copenhagen",
    viewport: { width: 375, height: 812 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node ${path.resolve(__dirname, "../parity/support/static-server.mjs")} "${process.env.AUTH_E2E_DIR ?? ""}"`,
    env: { PARITY_PORT: String(APP_PORT) },
    url: BASE_URL,
    reuseExistingServer: false,
  },
  projects: [
    { name: "flows", testMatch: /flows\.spec\.ts/ },
    // Design review shots (plan §7): only with AUTH_SHOTS_DIR, `--project=shots`.
    ...(SHOTS_DIR
      ? [{ name: "shots", testMatch: /login-shots\.spec\.ts/, use: { deviceScaleFactor: 2 } }]
      : []),
  ],
});
