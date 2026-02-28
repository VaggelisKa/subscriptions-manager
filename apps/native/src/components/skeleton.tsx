import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useThemeColors } from "@/providers/theme-provider";
import { radius } from "@/lib/theme";

type Props = {
  width?: number | string;
  height?: number;
  style?: object;
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
          backgroundColor: colors.muted,
          borderRadius: radius.sm,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
