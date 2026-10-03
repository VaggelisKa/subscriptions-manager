import { PlatformColor } from "react-native";
import { Circle, HStack, Picker, Text as SwiftText } from "@expo/ui/swift-ui";
import {
  foregroundStyle,
  frame,
  pickerStyle,
  tag,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import type { Category } from "@subscriptions-manager/shared";

type Props = {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * A "Category" form row whose value opens a native menu. The leading dot
 * shows the selected category's colour.
 */
export function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  const selected = categories.find((c) => c.id === selectedId);
  const color =
    selected?.color_hex && HEX.test(selected.color_hex)
      ? selected.color_hex
      : "gray";

  return (
    <Picker
      label={
        <HStack spacing={10}>
          <Circle
            modifiers={[frame({ width: 10, height: 10 }), foregroundStyle(color)]}
          />
          <SwiftText>Category</SwiftText>
        </HStack>
      }
      selection={selectedId}
      onSelectionChange={(value) => onSelect(String(value))}
      // Without a tint the value is black at first and turns blue once picked.
      modifiers={[pickerStyle("menu"), tint(PlatformColor("secondaryLabel"))]}
    >
      {/* Only edits can be uncategorised; offer "None" just to show that. */}
      {!selected && <SwiftText modifiers={[tag("")]}>None</SwiftText>}
      {categories.map((cat) => (
        <SwiftText key={cat.id} modifiers={[tag(cat.id)]}>
          {cat.name ?? ""}
        </SwiftText>
      ))}
    </Picker>
  );
}
