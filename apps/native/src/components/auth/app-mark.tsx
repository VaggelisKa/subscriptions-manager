import { View } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";

const bars = [
  { width: 22, opacity: 1 },
  { width: 22, opacity: 0.75 },
  { width: 14, opacity: 0.5 },
];

/** App mark: an orange tile with three stacked bars, like a list of charges. */
export function AppMark() {
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
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 24px -10px rgba(249, 115, 22, 0.7)",
      }}
    >
      <View style={{ width: 22, gap: 2 }}>
        {bars.map((bar, index) => (
          <View
            key={index}
            style={{
              width: bar.width,
              height: 5.5,
              borderRadius: 2.75,
              backgroundColor: "#fff",
              opacity: bar.opacity,
            }}
          />
        ))}
      </View>
    </View>
  );
}
