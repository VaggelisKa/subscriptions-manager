/**
 * Per-screen visual thresholds (spec §12A.4a). Empty for the Next baseline.
 *
 * The default for every shot is `threshold: 0.2, maxDiffPixelRatio: 0.005` (playwright.config.ts).
 * An override is allowed only with a reason here and an entry in APPROVED_DIFFS.md, and is
 * capped at 2% of pixels. Keys: `<area>/<state>` (every viewport and theme) or
 * `<area>/<state>--<width>-<theme>` (one shot), e.g.
 *
 *   "desktop/ledger--1440-dark": { maxDiffPixelRatio: 0.01, reason: "text antialiasing in RN Web `Text`" },
 */
export const MAX_DIFF_PIXEL_RATIO_CAP = 0.02;

export const thresholds: Record<string, { maxDiffPixelRatio: number; reason: string }> = {};

/** The override for one shot, or undefined for the default. Throws above the cap. */
export function maxDiffPixelRatioFor(state: string, shot: string): number | undefined {
  const override = thresholds[shot] ?? thresholds[state];
  if (!override) return undefined;
  if (!override.reason) throw new Error(`thresholds.ts: "${shot}" needs a reason`);
  if (override.maxDiffPixelRatio > MAX_DIFF_PIXEL_RATIO_CAP) {
    throw new Error(`thresholds.ts: "${shot}" exceeds the ${MAX_DIFF_PIXEL_RATIO_CAP * 100}% cap`);
  }
  return override.maxDiffPixelRatio;
}
