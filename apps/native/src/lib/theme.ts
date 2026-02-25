export const fonts = {
  regular: "Nunito-Regular",
  medium: "Nunito-Medium",
  semiBold: "Nunito-SemiBold",
  bold: "Nunito-Bold",
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
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

const lightColors = {
  background: "hsl(0, 0%, 100%)",
  foreground: "hsl(20, 14.3%, 4.1%)",
  card: "hsl(0, 0%, 100%)",
  cardForeground: "hsl(20, 14.3%, 4.1%)",
  primary: "hsl(24.6, 95%, 53.1%)",
  primaryForeground: "hsl(60, 9.1%, 97.8%)",
  secondary: "hsl(60, 4.8%, 95.9%)",
  secondaryForeground: "hsl(24, 9.8%, 10%)",
  muted: "hsl(60, 4.8%, 95.9%)",
  mutedForeground: "hsl(25, 5.3%, 44.7%)",
  destructive: "hsl(0, 84.2%, 60.2%)",
  destructiveForeground: "hsl(60, 9.1%, 97.8%)",
  success: "hsl(121, 35%, 51%)",
  successForeground: "hsl(60, 9.1%, 97.8%)",
  border: "hsl(20, 5.9%, 90%)",
  input: "hsl(20, 5.9%, 90%)",
  ring: "hsl(24.6, 95%, 53.1%)",
};

const darkColors = {
  background: "hsl(20, 14.3%, 4.1%)",
  foreground: "hsl(60, 9.1%, 97.8%)",
  card: "hsl(20, 14.3%, 4.1%)",
  cardForeground: "hsl(60, 9.1%, 97.8%)",
  primary: "hsl(20.5, 90.2%, 48.2%)",
  primaryForeground: "hsl(60, 9.1%, 97.8%)",
  secondary: "hsl(12, 6.5%, 15.1%)",
  secondaryForeground: "hsl(60, 9.1%, 97.8%)",
  muted: "hsl(12, 6.5%, 15.1%)",
  mutedForeground: "hsl(24, 5.4%, 63.9%)",
  destructive: "hsl(0, 72.2%, 50.6%)",
  destructiveForeground: "hsl(60, 9.1%, 97.8%)",
  success: "hsl(116, 46%, 49%)",
  successForeground: "hsl(60, 9.1%, 97.8%)",
  border: "hsl(12, 6.5%, 15.1%)",
  input: "hsl(12, 6.5%, 15.1%)",
  ring: "hsl(20.5, 90.2%, 48.2%)",
};

export type ThemeColors = typeof lightColors;

export const themes = {
  light: lightColors,
  dark: darkColors,
} as const;
