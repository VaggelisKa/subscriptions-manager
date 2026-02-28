import React, { createContext, useEffect, useState } from "react";
import { type ColorSchemeName } from "react-native";
import { themes, type ThemeColors } from "@/lib/theme";
import {
  type ThemeOverride,
  loadThemeOverride,
  saveThemeOverride,
} from "@/lib/user-options";

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
  const [override, setOverride] = useState<ThemeOverride>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const colorScheme = override ?? (systemScheme === "dark" ? "dark" : "light");
  const colors = themes[colorScheme];

  useEffect(() => {
    let isMounted = true;

    async function hydrateThemePreference() {
      const storedOverride = await loadThemeOverride();
      if (!isMounted) return;
      setOverride(storedOverride);
      setIsHydrated(true);
    }

    void hydrateThemePreference();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    void saveThemeOverride(override);
  }, [override, isHydrated]);

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
