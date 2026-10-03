/**
 * Category colours are user data (`#RRGGBB`). Returns the colour at the given opacity as
 * `#RRGGBBAA`, or `fallback` when the value is not a 6-digit hex.
 */
export function withAlpha(hex: string | null | undefined, alpha: number, fallback: string): string {
  if (!isHexColor(hex)) return fallback;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

export function isHexColor(value: string | null | undefined): value is string {
  return !!value && /^#[0-9a-f]{6}$/i.test(value);
}

/** The soft fill behind a category's tile or swatch: a tint of its colour, stronger in the dark. */
export function categoryTint(hex: string | null | undefined, dark: boolean, fallback: string): string {
  return withAlpha(hex, dark ? 0.24 : 0.14, fallback);
}
