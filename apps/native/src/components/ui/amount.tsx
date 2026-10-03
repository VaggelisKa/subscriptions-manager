import { Text, type TextStyle } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts } from "@/lib/theme";
import { formatNumber, formatWholeNumber } from "@/lib/format";

type Props = {
  value: number;
  /** Font size of the number; the "kr" suffix is set at half size. */
  size?: number;
  /** Round to whole kroner (totals, normalised amounts). */
  whole?: boolean;
  /** Trailing muted text after "kr", e.g. "/ month". */
  trailing?: string;
  color?: string;
  style?: TextStyle;
};

/** A display amount: heavy number, smaller muted currency after it. */
export function Amount({
  value,
  size = 46,
  whole = false,
  trailing,
  color,
  style,
}: Props) {
  const colors = useThemeColors();

  return (
    <Text
      selectable
      numberOfLines={1}
      adjustsFontSizeToFit
      maxFontSizeMultiplier={1.2}
      style={[
        {
          fontFamily: fonts.black,
          fontSize: size,
          lineHeight: Math.round(size * 1.1),
          letterSpacing: -size * 0.035,
          color: color ?? colors.foreground,
          fontVariant: ["tabular-nums"],
        },
        style,
      ]}
    >
      {whole ? formatWholeNumber(value) : formatNumber(value)}
      <Text
        style={{
          fontFamily: fonts.extraBold,
          fontSize: Math.max(13, Math.round(size * 0.36)),
          letterSpacing: 0,
          color: colors.mutedForeground,
        }}
      >
        {` kr${trailing ? ` ${trailing}` : ""}`}
      </Text>
    </Text>
  );
}
