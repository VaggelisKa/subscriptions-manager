import { View } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { radius } from "@/lib/theme";

type Props = {
  width?: number | string;
  height?: number;
  style?: object;
};

export function SkeletonView({ width, height = 16, style }: Props) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        {
          width: width ?? "100%",
          height,
          backgroundColor: colors.muted,
          borderRadius: radius.sm,
        },
        style,
      ]}
    />
  );
}
