import path from "node:path";
import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";
import {
  APP_PORT,
  BASE_URL,
  FIXED_TIME,
  LOCALE,
  PARITY_DIR,
  PROXY_PORT,
  PROXY_URL,
  REPO_ROOT,
  SUPABASE_URL,
  TARGET,
  TIME_ZONE,
} from "./support/env";

/**
 * Web parity suite (spec §12A). PARITY_TARGET=next (default) builds and starts apps/web;
 * PARITY_TARGET=expo serves PARITY_EXPO_DIR (an `expo export -p web` output). Both compare
 * against the same baseline/. Run it through run.sh (pinned Docker image).
 */

const WIDTHS = { 375: 812, 1024: 768, 1440: 900 } as const;
const THEMES = ["light", "dark"] as const;

const nextBin = path.join(REPO_ROOT, "node_modules/next/dist/bin/next");
const fakeClock = path.join(PARITY_DIR, "support/fake-clock.cjs");

const appServer: NonNullable<PlaywrightTestConfig["webServer"]> =
  TARGET === "next"
    ? {
        // `next build && next start` against the local stack, through the fault proxy. Only
        // `next start` runs on the fixed clock (support/fake-clock.cjs).
        command: [
          process.env.PARITY_SKIP_BUILD ? null : `node ${nextBin} build`,
          `NODE_OPTIONS="--require ${fakeClock}" node ${nextBin} start -p ${APP_PORT} -H 127.0.0.1`,
        ]
          .filter(Boolean)
          .join(" && "),
        cwd: path.join(REPO_ROOT, "apps/web"),
        env: {
          NEXT_PUBLIC_SUPABASE_URL: PROXY_URL,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.PARITY_SUPABASE_PUBLISHABLE_KEY ?? "",
          NEXT_TELEMETRY_DISABLED: "1",
          TZ: TIME_ZONE,
          PARITY_FIXED_TIME: FIXED_TIME,
        },
        url: `${BASE_URL}/login`,
        timeout: 300_000,
        reuseExistingServer: false,
        stdout: "pipe",
      }
    : {
        command: `node support/static-server.mjs "${process.env.PARITY_EXPO_DIR ?? ""}"`,
        cwd: PARITY_DIR,
        env: { PARITY_PORT: String(APP_PORT) },
        url: BASE_URL,
        reuseExistingServer: false,
      };

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  // One baseline for both targets (spec §12A.3): baseline/<area>/<state>--<width>-<theme>.png.
  snapshotPathTemplate: "{testDir}/../baseline/{arg}{ext}",
  globalSetup: "./support/global-setup.ts",
  globalTeardown: "./support/global-teardown.ts",
  // Flaky shots must fail, not pass on a retry.
  retries: 0,
  workers: Number(process.env.PARITY_WORKERS ?? 4),
  timeout: 60_000,
  forbidOnly: true,
  reporter: [["list"], ["html", { open: "never", outputFolder: "./playwright-report" }]],
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixelRatio: 0.005,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: BASE_URL,
    locale: LOCALE,
    timezoneId: TIME_ZONE,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node support/supabase-proxy.mjs",
      cwd: PARITY_DIR,
      env: { PARITY_PROXY_PORT: String(PROXY_PORT), PARITY_SUPABASE_URL: SUPABASE_URL },
      url: `${PROXY_URL}/__parity/health`,
      reuseExistingServer: false,
    },
    appServer,
  ],
  projects: [
    // Visual: one project per viewport × colour scheme. A state lists the widths it exists at
    // as tags (@w375 …), and each project only runs its own width.
    ...Object.entries(WIDTHS).flatMap(([width, height]) =>
      THEMES.map((theme) => ({
        name: `visual-${width}-${theme}`,
        testMatch: /visual\/.*\.spec\.ts/,
        grep: new RegExp(`@w${width}\\b`),
        fullyParallel: true,
        metadata: { width: Number(width), theme },
        use: { viewport: { width: Number(width), height }, colorScheme: theme },
      })),
    ),
    // Functional flows (spec §12A.4b): light scheme; each test sets its viewport.
    {
      name: "flows",
      testMatch: /flows\/.*\.spec\.ts/,
      use: { viewport: { width: 1440, height: 900 }, colorScheme: "light" },
    },
  ],
});
