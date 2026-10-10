import React, { createContext, useEffect, useState } from "react";
import type { ColorSchemeName } from "react-native";
import { themes, type ThemeColors } from "@/lib/theme";
import { resolveColorScheme, type ThemePreference } from "@/lib/theme-preference";
import {
  applyThemePreference,
  saveThemePreference,
  subscribeToThemePreference,
} from "@/lib/theme-storage";

type ThemeContextType = {
  /** The setting: "system" follows the OS. */
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  /** What is rendered. */
  colorScheme: "light" | "dark";
  colors: ThemeColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
  colorScheme: "light",
  colors: themes.light,
  toggleTheme: () => {},
});

export function ThemeProvider({
  children,
  colorScheme: systemScheme,
  initialTheme,
}: {
  children: React.ReactNode;
  colorScheme: ColorSchemeName | null;
  initialTheme: ThemePreference;
}) {
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme);
  const colorScheme = resolveColorScheme(theme, systemScheme);
  const colors = themes[colorScheme];

  // Native: the window's appearance. Web: the <html> class and `color-scheme`.
  useEffect(() => {
    applyThemePreference(theme, colorScheme);
  }, [theme, colorScheme]);

  useEffect(() => subscribeToThemePreference(setThemeState), []);

  function setTheme(next: ThemePreference) {
    setThemeState(next);
    saveThemePreference(next);
  }

  function toggleTheme() {
    setTheme(colorScheme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorScheme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.use(ThemeContext);
}

export function useThemeColors() {
  return React.use(ThemeContext).colors;
}
