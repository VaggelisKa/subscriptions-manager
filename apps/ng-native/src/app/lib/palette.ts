import type { Scheme } from "@ng-native/device";

/**
 * apps/native's colours for the places CSS cannot reach: native bar buttons, header props and
 * SwiftUI modifiers. Everything styled with CSS uses the same values as tokens in `theme.css`.
 */
const light = {
  background: "hsl(60, 4.8%, 95.9%)",
  foreground: "hsl(20, 14.3%, 4.1%)",
  muted: "hsl(25, 5.3%, 44.7%)",
  faint: "hsl(24, 5.4%, 63.9%)",
  primary: "hsl(24.6, 95%, 53.1%)",
  primaryText: "hsl(17.5, 88.3%, 40.4%)",
  fill: "hsla(25, 5.3%, 44.7%, 0.12)",
  destructive: "hsl(0, 72.2%, 47%)",
};

const dark: typeof light = {
  background: "hsl(20, 14.3%, 4.1%)",
  foreground: "hsl(60, 9.1%, 97.8%)",
  muted: "hsl(24, 5.4%, 63.9%)",
  faint: "hsl(25, 5.3%, 44.7%)",
  primary: "hsl(20.5, 90.2%, 48.2%)",
  primaryText: "hsl(27, 96%, 61%)",
  fill: "hsla(24, 5.4%, 63.9%, 0.16)",
  destructive: "hsl(0, 72.2%, 50.6%)",
};

export type Palette = typeof light;

export function palette(scheme: Scheme): Palette {
  return scheme === "dark" ? dark : light;
}
