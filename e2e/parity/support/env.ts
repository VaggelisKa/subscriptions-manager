import path from "node:path";

/** Everything the suite agrees on: the fixed "now", ports, URLs and fixture users. */

export const PARITY_DIR = path.resolve(__dirname, "..");
export const REPO_ROOT = path.resolve(PARITY_DIR, "../..");

/** The fixed "now" (spec §12A.2). Browser: `page.clock`; Next server: `support/fake-clock.cjs`. */
export const FIXED_TIME = "2026-10-14T10:00:00+02:00";
export const TIME_ZONE = "Europe/Copenhagen";
/** What the app formats numbers with (`packages/shared/src/format.ts`, `LOCALE`). */
export const LOCALE = "en-DK";

export type Target = "next" | "expo";
export const TARGET: Target = process.env.PARITY_TARGET === "expo" ? "expo" : "next";

export const APP_PORT = Number(process.env.PARITY_PORT ?? 3210);
export const BASE_URL = `http://127.0.0.1:${APP_PORT}`;

/** The local stack (never a hosted project). */
export const SUPABASE_URL = process.env.PARITY_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const DB_URL = process.env.PARITY_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
/** The local stack's mail catcher, where magic links land. */
export const MAILPIT_URL = process.env.PARITY_MAILPIT_URL ?? "http://127.0.0.1:54324";
export function publishableKey() {
  const key = process.env.PARITY_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("PARITY_SUPABASE_PUBLISHABLE_KEY is not set; run the suite through e2e/parity/run.sh");
  return key;
}

/**
 * The app talks to Supabase through `support/supabase-proxy.mjs`, a transparent
 * proxy that tests can tell to delay or fail requests for one user (loading
 * skeleton, load error). The app is built with this URL instead of :54321.
 */
export const PROXY_PORT = Number(process.env.PARITY_PROXY_PORT ?? 54399);
export const PROXY_URL = `http://127.0.0.1:${PROXY_PORT}`;

/** Where loginAs() finds the sessions globalSetup created (one sign-in per user per run). */
export const AUTH_DIR = path.join(PARITY_DIR, ".auth");
/** Per-test axe results before globalTeardown merges them. */
export const AXE_TMP_DIR = path.join(PARITY_DIR, ".axe-results");
export const AXE_BASELINE = path.join(PARITY_DIR, "axe-baseline.json");
/** `record` rewrites axe-baseline.json, `compare` fails on new violations, `off` skips axe. */
export const AXE_MODE = (process.env.PARITY_AXE ?? "compare") as "record" | "compare" | "off";

/** Local-only password shared by every fixture user (seed.sql). */
export const PASSWORD = "parity-password-local";

export type UserKey =
  | "populated"
  | "empty"
  | "loading"
  | "failing"
  | "writerAdd"
  | "writerEdit"
  | "writerDelete"
  | "signout"
  | "slow"
  | "retry"
  | "realtime";

export type FixtureUser = { id: string; email: string };

/** Same ids and emails as seed.sql. */
export const USERS: Record<UserKey, FixtureUser> = {
  populated: { id: "00000000-0000-4000-a000-000000000001", email: "populated@parity.test" },
  empty: { id: "00000000-0000-4000-a000-000000000002", email: "empty@parity.test" },
  loading: { id: "00000000-0000-4000-a000-000000000003", email: "loading@parity.test" },
  failing: { id: "00000000-0000-4000-a000-000000000004", email: "failing@parity.test" },
  writerAdd: { id: "00000000-0000-4000-a000-000000000005", email: "writer-add@parity.test" },
  writerEdit: { id: "00000000-0000-4000-a000-000000000006", email: "writer-edit@parity.test" },
  writerDelete: { id: "00000000-0000-4000-a000-000000000007", email: "writer-delete@parity.test" },
  signout: { id: "00000000-0000-4000-a000-000000000008", email: "signout@parity.test" },
  slow: { id: "00000000-0000-4000-a000-000000000009", email: "slow@parity.test" },
  retry: { id: "00000000-0000-4000-a000-000000000010", email: "retry@parity.test" },
  realtime: { id: "00000000-0000-4000-a000-000000000011", email: "realtime@parity.test" },
};

/** Subscription ids follow seed.sql: `0000000<user no>-0000-4000-b000-0000000000<nn>`. */
export function subscriptionId(user: FixtureUser, n: number) {
  const userNo = user.id.slice(-8);
  return `${userNo}-0000-4000-b000-${String(n).padStart(12, "0")}`;
}

/** The populated fixture (seed.sql), by number, for assertions. */
export const SUBS = {
  netflix: { n: 1, name: "Netflix" },
  spotify: { n: 2, name: "Spotify Premium Family Plan with Six Accounts" },
  fitness: { n: 3, name: "Fitness World" },
  electricity: { n: 4, name: "Ørsted Electricity" },
  photon: { n: 5, name: "Photon Cloud Backup" },
  dsb: { n: 6, name: "DSB Commuter Pass" },
  duolingo: { n: 7, name: "Duolingo Super" },
  podcast: { n: 8, name: "Podcast Supporter Club" },
  accountant: { n: 9, name: "Accountant Retainer" },
  claude: { n: 10, name: "Claude Pro" },
  allotment: { n: 11, name: "Neighbourhood Allotment Garden Association Annual Membership Fee" },
  adobe: { n: 12, name: "Adobe Creative Cloud" },
} as const;
