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
 * Generated ids (React `useId`, Radix) in a selector, as `#…` or inside an attribute value
 * (`label[for="_r_4_-name"]`), so they don't show as churn in the file. A target left with
 * nothing but a placeholder gets the node's role / label / name next to it, so findings on
 * different nodes stay tellable apart.
 */
function normalizeTarget(selector: string, html: string) {
  const normalized = selector
    .replace(/(radix-)?(_r_[0-9a-z]+_|\\?:r[0-9a-z]+\\?:|«r[0-9a-z]+»)/g, "<generated>")
    .replace(/#[^\s>.,:[]*(radix|«|»|_r_|:r)[^\s>.,[]*/g, "#<generated>");
  if (normalized !== "#<generated>") return normalized;
  const tag = html.match(/^<[^>]*>/)?.[0] ?? "";
  const attrs = [...tag.matchAll(/\s(role|aria-label|name|type)="([^"]*)"/g)].map(([, k, v]) => `${k}="${v}"`);
  return attrs.length ? `${normalized} (${attrs.join(" ")})` : normalized;
}

/**
 * Runs axe on the current page state. `record` stores the result for globalTeardown to merge
 * into axe-baseline.json. `compare` returns what's new for this state: a rule the baseline
 * doesn't have, or more failing nodes for a rule than it recorded.
 *
 * Nodes are compared by count, not by selector: axe builds the shortest unique selector for
 * each node, which shifts with unrelated DOM (and means nothing against the Expo app's DOM).
 * The recorded targets are there for people reading the file.
 */
export async function checkAxe(page: Page, state: string): Promise<string[]> {
  if (AXE_MODE === "off") return [];
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const violations: AxeViolation[] = results.violations
    .map((v) => ({
      rule: v.id,
      impact: v.impact ?? null,
      targets: v.nodes.map((n) => normalizeTarget(n.target.map(String).join(" "), n.html)).sort(),
    }))
    .sort((a, b) => a.rule.localeCompare(b.rule));

  if (AXE_MODE === "record") {
    fs.mkdirSync(AXE_TMP_DIR, { recursive: true });
    const file = path.join(AXE_TMP_DIR, `${state.replace(/[^a-z0-9-]+/gi, "_")}.json`);
    fs.writeFileSync(file, JSON.stringify({ state, axeVersion: results.testEngine.version, violations }));
    return [];
  }

  const baseline: AxeBaseline = JSON.parse(fs.readFileSync(AXE_BASELINE, "utf8"));
  const recorded = new Map((baseline.states[state] ?? []).map((v) => [v.rule, v.targets.length]));
  return violations
    .filter((v) => v.targets.length > (recorded.get(v.rule) ?? 0))
    .map((v) => `${v.rule} (${v.impact}): ${v.targets.length} nodes, baseline ${recorded.get(v.rule) ?? 0}; ${v.targets.join(" | ")}`);
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
