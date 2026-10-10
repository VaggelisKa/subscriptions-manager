import type { ThemeColors } from "@/lib/theme";
import { fonts } from "@/lib/theme";

/** Header and content styling shared by the (auth) and (app) stacks. */
export function stackScreenOptions(colors: ThemeColors) {
  return {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.foreground,
    headerTitleStyle: {
      fontFamily: fonts.extraBold,
      color: colors.foreground,
    },
    headerLargeTitleStyle: {
      fontFamily: fonts.black,
      color: colors.foreground,
    },
    contentStyle: { backgroundColor: colors.background },
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerBackButtonDisplayMode: "minimal" as const,
  };
}
