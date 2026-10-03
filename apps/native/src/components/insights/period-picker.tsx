import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { useTheme } from "@/providers/theme-provider";
import { haptics } from "@/lib/haptics";
import type { Period } from "./spend-by-category";

const options: { value: Period; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

type Props = {
  value: Period;
  onChange: (value: Period) => void;
};

/** Native segmented control for Week / Month / Year. */
export function PeriodPicker({ value, onChange }: Props) {
  const { colorScheme } = useTheme();

  return (
    <Host matchContents={{ vertical: true }} colorScheme={colorScheme}>
      <Picker
        selection={value}
        onSelectionChange={(next) => {
          if (next === value) return;
          haptics.selection();
          onChange(next as Period);
        }}
        modifiers={[pickerStyle("segmented")]}
      >
        {options.map((o) => (
          <Text key={o.value} modifiers={[tag(o.value)]}>
            {o.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
