import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/providers/theme-provider";
import { fonts } from "@/lib/theme";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
};

/**
 * iOS-style segmented control in plain RN (the SwiftUI one is iOS-only): a
 * radio group whose options share the width, the chosen one raised on a
 * surface.
 */
export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  const { colors, colorScheme } = useTheme();

  return (
    <View role="radiogroup" aria-label={label} style={[styles.group, { backgroundColor: colors.fill }]}>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="radio"
            aria-checked={checked}
            onPress={() => {
              if (!checked) onChange(option.value);
            }}
            style={[
              styles.option,
              checked && [
                styles.checked,
                // The web app raises the dark option on this lighter brown, not a token.
                { backgroundColor: colorScheme === "dark" ? "hsl(24, 6%, 28%)" : colors.surface },
              ],
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, { color: colors.foreground, opacity: checked ? 1 : 0.8 }]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    padding: 2,
    borderRadius: 9,
    borderCurve: "continuous",
  },
  option: {
    flex: 1,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    borderCurve: "continuous",
  },
  checked: {
    boxShadow: "0 3px 8px rgba(0, 0, 0, 0.12), 0 0 0 0.5px rgba(0, 0, 0, 0.04)",
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
});
