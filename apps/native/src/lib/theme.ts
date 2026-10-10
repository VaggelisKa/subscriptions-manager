export const fonts = {
  regular: "Nunito-Regular",
  medium: "Nunito-Medium",
  semiBold: "Nunito-SemiBold",
  bold: "Nunito-Bold",
  extraBold: "Nunito-ExtraBold",
  black: "Nunito-Black",
} as const;

/**
 * Corner radii, always paired with `borderCurve: "continuous"`.
 * Nested surfaces use outer radius minus padding.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  sheet: 34,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Type scale. Amounts and titles use the heavy weights so the important
 * numbers carry visual weight; everything else stays quiet.
 */
export const type = {
  amount: { fontFamily: fonts.black, fontSize: 46, lineHeight: 50, letterSpacing: -1.6 },
  largeTitle: { fontFamily: fonts.black, fontSize: 34, lineHeight: 41, letterSpacing: -0.6 },
  title: { fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  sectionTitle: { fontFamily: fonts.extraBold, fontSize: 18, lineHeight: 23 },
  headline: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  subhead: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 20 },
  footnote: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 13 },
} as const;

const lightColors = {
  /** Grouped page background; raised content sits on `surface`. */
  background: "hsl(60, 4.8%, 95.9%)",
  surface: "hsl(0, 0%, 100%)",
  foreground: "hsl(20, 14.3%, 4.1%)",
  mutedForeground: "hsl(25, 5.3%, 44.7%)",
  faint: "hsl(24, 5.4%, 63.9%)",
  primary: "hsl(24.6, 95%, 53.1%)",
  primaryForeground: "hsl(60, 9.1%, 97.8%)",
  /** Orange for text on surfaces; tuned per scheme for contrast. */
  primaryText: "hsl(17.5, 88.3%, 40.4%)",
  primarySoft: "hsla(24.6, 95%, 53.1%, 0.12)",
  /** Translucent fill for chips, segmented controls and placeholders. */
  fill: "hsla(25, 5.3%, 44.7%, 0.12)",
  separator: "hsl(20, 5.9%, 90%)",
  destructive: "hsl(0, 72.2%, 47%)",
  destructiveForeground: "hsl(60, 9.1%, 97.8%)",
  success: "hsl(121, 35%, 51%)",
  successForeground: "hsl(60, 9.1%, 97.8%)",
  /** Floating chrome (toolbar buttons, menus) is glass over the content. */
  glass: "hsla(0, 0%, 100%, 0.72)",
  /** Opacity of a category colour's tint behind its letter or dot (`withAlpha`). */
  tileAlpha: 0.14,
};

const darkColors: typeof lightColors = {
  background: "hsl(20, 14.3%, 4.1%)",
  surface: "hsl(24, 9.8%, 10%)",
  foreground: "hsl(60, 9.1%, 97.8%)",
  mutedForeground: "hsl(24, 5.4%, 63.9%)",
  faint: "hsl(25, 5.3%, 44.7%)",
  primary: "hsl(20.5, 90.2%, 48.2%)",
  primaryForeground: "hsl(60, 9.1%, 97.8%)",
  primaryText: "hsl(27, 96%, 61%)",
  primarySoft: "hsla(20.5, 90.2%, 48.2%, 0.2)",
  fill: "hsla(24, 5.4%, 63.9%, 0.16)",
  separator: "hsl(12, 6.5%, 15.1%)",
  destructive: "hsl(0, 72.2%, 50.6%)",
  destructiveForeground: "hsl(60, 9.1%, 97.8%)",
  success: "hsl(116, 46%, 49%)",
  successForeground: "hsl(60, 9.1%, 97.8%)",
  glass: "hsla(24, 9.8%, 14%, 0.72)",
  tileAlpha: 0.24,
};

export type ThemeColors = typeof lightColors;

export const themes = {
  light: lightColors,
  dark: darkColors,
} as const;

/**
 * The web app's name for each token: the CSS custom property in
 * `apps/web/src/app/globals.css` (`:root` is light, `.dark` is dark). The colours
 * here are the same values written as `hsl()`/`hsla()`; `tileAlpha` is the
 * percentage as a fraction.
 */
export const cssTokenNames: Record<keyof ThemeColors, `--${string}`> = {
  background: "--background",
  surface: "--surface",
  foreground: "--foreground",
  mutedForeground: "--muted-foreground",
  faint: "--faint",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  primaryText: "--primary-text",
  primarySoft: "--primary-soft",
  fill: "--fill",
  separator: "--separator",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  success: "--success",
  successForeground: "--success-foreground",
  glass: "--glass",
  tileAlpha: "--tile-alpha",
};

/**
 * Category colours are user data (`#RRGGBB`). Returns the colour at the given
 * opacity, or `fallback` when the value isn't a 6-digit hex.
 */
export function withAlpha(hex: string | null | undefined, alpha: number, fallback: string) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return fallback;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}
