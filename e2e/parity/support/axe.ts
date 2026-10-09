import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { AXE_BASELINE, AXE_MODE, AXE_TMP_DIR } from "./env";

/** WCAG 2.1 A + AA (spec §12A.4c). */
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export type AxeViolation = { rule: string; impact: string | null; targets: string[] };
export type AxeBaseline = { axeVersion: string; tags: string[]; states: Record<string, AxeViolation[]> };

/**
 * Selectors with generated ids (React `useId`, Radix) are stable for one build but not
 * meaningful across targets, so they're compared without the id.
 */
function normalizeTarget(selector: string) {
  return selector.replace(/#[^\s>.,:[]*(radix|«|»|_r_|:r)[^\s>.,[]*/g, "#<generated>");
}

function key(v: { rule: string }, target: string) {
  return `${v.rule} @ ${target}`;
}

/**
 * Runs axe on the current page state. `record` stores the result for globalTeardown to merge
 * into axe-baseline.json; `compare` returns every violation (rule + element) that the
 * baseline doesn't have for this state.
 */
export async function checkAxe(page: Page, state: string): Promise<string[]> {
  if (AXE_MODE === "off") return [];
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const violations: AxeViolation[] = results.violations
    .map((v) => ({
      rule: v.id,
      impact: v.impact ?? null,
      targets: v.nodes.map((n) => normalizeTarget(n.target.map(String).join(" "))).sort(),
    }))
    .sort((a, b) => a.rule.localeCompare(b.rule));

  if (AXE_MODE === "record") {
    fs.mkdirSync(AXE_TMP_DIR, { recursive: true });
    const file = path.join(AXE_TMP_DIR, `${state.replace(/[^a-z0-9-]+/gi, "_")}.json`);
    fs.writeFileSync(file, JSON.stringify({ state, axeVersion: results.testEngine.version, violations }));
    return [];
  }

  const baseline: AxeBaseline = JSON.parse(fs.readFileSync(AXE_BASELINE, "utf8"));
  const known = new Set((baseline.states[state] ?? []).flatMap((v) => v.targets.map((t) => key(v, t))));
  return violations.flatMap((v) =>
    v.targets.filter((t) => !known.has(key(v, t))).map((t) => `${key(v, t)} (${v.impact})`),
  );
}

/** globalTeardown (record mode): merges this run's states into axe-baseline.json, sorted. */
export function mergeAxeResults() {
  if (!fs.existsSync(AXE_TMP_DIR)) return;
  const baseline: AxeBaseline = fs.existsSync(AXE_BASELINE)
    ? JSON.parse(fs.readFileSync(AXE_BASELINE, "utf8"))
    : { axeVersion: "", tags: AXE_TAGS, states: {} };
  for (const file of fs.readdirSync(AXE_TMP_DIR)) {
    const { state, axeVersion, violations } = JSON.parse(fs.readFileSync(path.join(AXE_TMP_DIR, file), "utf8"));
    baseline.states[state] = violations;
    baseline.axeVersion = axeVersion;
  }
  baseline.tags = AXE_TAGS;
  const states = Object.fromEntries(Object.entries(baseline.states).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(AXE_BASELINE, `${JSON.stringify({ ...baseline, states }, null, 2)}\n`);
  fs.rmSync(AXE_TMP_DIR, { recursive: true, force: true });
}
