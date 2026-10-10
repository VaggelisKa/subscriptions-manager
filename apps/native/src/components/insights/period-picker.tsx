import { Segmented } from "@/components/ui/segmented";
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

/** Segmented control for Week / Month / Year (SwiftUI on iOS, `.ios.tsx`). */
export function PeriodPicker({ value, onChange }: Props) {
  return (
    <Segmented
      label="Period"
      options={options}
      value={value}
      onChange={(next) => {
        haptics.selection();
        onChange(next);
      }}
    />
  );
}
