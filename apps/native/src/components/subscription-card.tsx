import { View, Text, Pressable } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts, radius, spacing } from "@/lib/theme";
import {
  numberFormatOptions,
  getShortDateFromTimestamp,
  type SubscriptionWithCategory,
} from "@subscriptions-manager/shared";

type Props = {
  subscription: SubscriptionWithCategory;
  onPress: () => void;
};

export function SubscriptionCard({ subscription, onPress }: Props) {
  const colors = useThemeColors();

  const handlePress = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      layout={LinearTransition}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.muted : colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          borderLeftWidth: subscription.categories?.color_hex ? 3 : 1,
          borderLeftColor: subscription.categories?.color_hex ?? colors.border,
          padding: spacing.lg,
          borderCurve: "continuous",
        })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: spacing.xs, flexShrink: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.semiBold,
                fontSize: 15,
                color: colors.foreground,
              }}
            >
              {subscription.name}
            </Text>
            {subscription.categories?.name && (
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 13,
                  color: colors.mutedForeground,
                }}
              >
                {subscription.categories.name}
              </Text>
            )}
          </View>

          <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
            <Text
              selectable
              style={{
                fontFamily: fonts.semiBold,
                fontSize: 14,
                color: colors.foreground,
                fontVariant: ["tabular-nums"],
              }}
            >
              {subscription.price?.toLocaleString("en-DK", numberFormatOptions)}
            </Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 13,
                color: colors.mutedForeground,
              }}
            >
              {getShortDateFromTimestamp(subscription.billed_at ?? "")}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
