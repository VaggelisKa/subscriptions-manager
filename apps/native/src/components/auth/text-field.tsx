import type { Ref } from "react";
import {
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts, radius, spacing } from "@/lib/theme";

type Props = Omit<TextInputProps, "style"> & {
  /** Optional visible label above the field; turns destructive on error. */
  label?: string;
  error?: boolean;
  ref?: Ref<TextInputInstance>;
};

/** Filled, borderless text field. Errors draw a destructive ring. */
export function TextField({ label, error = false, ref, placeholder, ...props }: Props) {
  const colors = useThemeColors();

  return (
    <View style={{ gap: spacing.xs + 2 }}>
      {label ? (
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: 13,
            lineHeight: 18,
            paddingHorizontal: spacing.xs,
            color: error ? colors.destructive : colors.mutedForeground,
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        accessibilityLabel={label ?? placeholder}
        selectionColor={colors.primary}
        {...props}
        style={{
          minHeight: 52,
          paddingHorizontal: 14,
          borderRadius: radius.lg,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: error ? colors.destructive : "transparent",
          fontFamily: fonts.regular,
          fontSize: 16,
          color: colors.foreground,
        }}
      />
    </View>
  );
}
