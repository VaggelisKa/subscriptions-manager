import React, { createContext, useState } from "react";
import { type ColorSchemeName } from "react-native";
import { themes, type ThemeColors } from "@/lib/theme";

type ThemeContextType = {
  colorScheme: "light" | "dark";
  colors: ThemeColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  colorScheme: "light",
  colors: themes.light,
  toggleTheme: () => {},
});

export function ThemeProvider({
  children,
  colorScheme: systemScheme,
}: {
  children: React.ReactNode;
  colorScheme: ColorSchemeName;
}) {
  const [override, setOverride] = useState<"light" | "dark" | null>(null);
  const colorScheme = override ?? (systemScheme === "dark" ? "dark" : "light");
  const colors = themes[colorScheme];

  function toggleTheme() {
    setOverride((prev) => {
      if (prev === null) return systemScheme === "dark" ? "light" : "dark";
      return prev === "dark" ? "light" : "dark";
    });
  }

  return (
    <ThemeContext.Provider value={{ colorScheme, colors, toggleTheme }}>
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
