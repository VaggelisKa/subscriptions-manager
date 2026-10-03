import { View } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";

/** 60pt soft-orange tile with a drawn checkmark, for success states. */
export function SuccessBadge() {
  const colors = useThemeColors();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 60,
        height: 60,
        borderRadius: 18,
        borderCurve: "continuous",
        backgroundColor: colors.primarySoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 13,
          height: 24,
          marginTop: -5,
          borderRightWidth: 4,
          borderBottomWidth: 4,
          borderColor: colors.primaryText,
          borderBottomRightRadius: 2,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </View>
  );
}
