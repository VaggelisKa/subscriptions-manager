import { mergeAxeResults } from "./axe";
import { seed } from "./db";
import { AXE_MODE } from "./env";

/** Writes axe-baseline.json (record mode) and puts the fixtures back as seeded. */
export default async function globalTeardown() {
  if (AXE_MODE === "record") mergeAxeResults();
  await seed();
}
