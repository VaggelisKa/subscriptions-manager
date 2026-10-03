import { useEffect, type ComponentProps } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import type { DimensionValue, View } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { radius } from "@/lib/theme";

type Props = {
  width?: DimensionValue;
  height?: number;
  style?: ComponentProps<typeof View>["style"];
};

export function Skeleton({ width, height = 16, style }: Props) {
  const colors = useThemeColors();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 1200 }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width ?? "100%",
          height,
          backgroundColor: colors.fill,
          borderRadius: radius.sm,
          borderCurve: "continuous",
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
