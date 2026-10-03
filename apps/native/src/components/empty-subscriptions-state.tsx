import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useThemeColors } from "@/providers/theme-provider";
import { haptics } from "@/lib/haptics";
import { fonts, spacing } from "@/lib/theme";
import { Button } from "@/components/auth/button";

const QUICK_ADD = ["Netflix", "Spotify", "Viaplay", "TV 2 Play"];

/** Placeholder row hinting at what a tracked subscription will look like. */
function GhostRow({ opacity, plus = false }: { opacity: number; plus?: boolean }) {
  const colors = useThemeColors();
  const bar = { backgroundColor: colors.fill, borderRadius: 5 } as const;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        opacity,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11.4,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: plus ? colors.primarySoft : colors.fill,
        }}
      >
        {plus ? (
          <Text
            style={{
              fontFamily: fonts.black,
              fontSize: 22,
              lineHeight: 26,
              color: colors.primaryText,
            }}
          >
            +
          </Text>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={[bar, { height: 10, width: plus ? "60%" : "50%" }]} />
        <View style={[bar, { height: 8, width: "30%", borderRadius: 4 }]} />
      </View>
      <View style={[bar, { height: 10, width: 44 }]} />
    </View>
  );
}

export function EmptySubscriptionsState() {
  const colors = useThemeColors();

  return (
    <View style={{ paddingTop: spacing.sm }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ gap: spacing.sm, marginBottom: 22 }}
      >
        <GhostRow opacity={1} plus />
        <GhostRow opacity={0.6} />
        <GhostRow opacity={0.3} />
      </View>

      <View style={{ gap: spacing.sm, paddingHorizontal: spacing.xs }}>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: fonts.black,
            fontSize: 24,
            lineHeight: 28,
            letterSpacing: -0.5,
            color: colors.foreground,
          }}
        >
          Track your first subscription
        </Text>
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 15,
            lineHeight: 21,
            color: colors.mutedForeground,
          }}
        >
          Add what you pay for and see what&apos;s due next, and what it adds up
          to each month.
        </Text>
      </View>

      <Button
        title="Add subscription"
        onPress={() => router.push("/subscription-form")}
        style={{ marginTop: 22, marginBottom: 18 }}
      />

      <Text
        style={{
          fontFamily: fonts.bold,
          fontSize: 13,
          lineHeight: 18,
          color: colors.mutedForeground,
          paddingHorizontal: spacing.xs,
          paddingBottom: spacing.sm,
        }}
      >
        Quick add
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {QUICK_ADD.map((name) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={`Add ${name}`}
            onPress={() => {
              haptics.selection();
              router.push({ pathname: "/subscription-form", params: { name } });
            }}
            style={({ pressed }) => ({
              paddingVertical: spacing.sm,
              paddingHorizontal: 14,
              borderRadius: 999,
              backgroundColor: colors.fill,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 14,
                color: colors.foreground,
              }}
            >
              + {name}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
