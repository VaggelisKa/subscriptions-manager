import fs from "node:fs";
import { createSessions } from "./auth";
import { seed } from "./db";
import { AXE_BASELINE, AXE_MODE, AXE_TMP_DIR, TARGET } from "./env";

/** Seeds the fixtures, signs every fixture user in once, and resets the axe scratch dir. */
export default async function globalSetup() {
  console.log(`[parity] target=${TARGET} axe=${AXE_MODE}`);
  await seed();
  await createSessions();
  fs.rmSync(AXE_TMP_DIR, { recursive: true, force: true });
  if (AXE_MODE === "compare" && !fs.existsSync(AXE_BASELINE)) {
    throw new Error("axe-baseline.json is missing: capture it with run.sh --update (PARITY_AXE=record)");
  }
}
