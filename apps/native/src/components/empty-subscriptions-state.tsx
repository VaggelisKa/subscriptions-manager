import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts, radius, spacing } from "@/lib/theme";

const styles = {
  emptyState: {
    alignItems: "center" as const,
    gap: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlign: "center" as const,
  },
  addButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderCurve: "continuous" as const,
  },
  addButtonPressed: {
    opacity: 0.7,
  },
  addButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
};

export function EmptySubscriptionsState() {
  const colors = useThemeColors();

  return (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        No subscriptions
      </Text>
      <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
        You do not have any subscriptions yet.{"\n"}Add one to get started!
      </Text>
      <Pressable
        onPress={() => router.push("/subscription-form")}
        style={({ pressed }) => [
          styles.addButton,
          { backgroundColor: colors.primary },
          pressed && styles.addButtonPressed,
        ]}
      >
        <Text
          style={[
            styles.addButtonText,
            { color: colors.primaryForeground },
          ]}
        >
          Add your first one
        </Text>
      </Pressable>
    </View>
  );
}
