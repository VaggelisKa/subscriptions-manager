import { DatePicker, Host } from "@expo/ui/swift-ui";
import { datePickerStyle } from "@expo/ui/swift-ui/modifiers";
import { useTheme } from "@/providers/theme-provider";
import type { DateFieldProps } from "./date-field";

/** A labelled SwiftUI compact date picker: the label, then the date as a button. */
export function DateField({ label, value, onChange }: DateFieldProps) {
  const { colorScheme } = useTheme();

  return (
    <Host matchContents={{ vertical: true }} colorScheme={colorScheme}>
      <DatePicker
        title={label}
        selection={value}
        displayedComponents={["date"]}
        onDateChange={onChange}
        modifiers={[datePickerStyle("compact")]}
      />
    </Host>
  );
}
