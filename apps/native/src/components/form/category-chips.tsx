import {
  Button,
  Circle,
  HStack,
  ScrollView,
  Text as SwiftText,
} from "@expo/ui/swift-ui";
import {
  buttonBorderShape,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  listRowInsets,
  padding,
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
 * A horizontally scrolling row of category capsules for a `Form` section.
 * Each chip shows its category colour; the selected one is filled with it.
 */
export function CategoryChips({ categories, selectedId, onSelect }: Props) {
  return (
    <ScrollView
      axes="horizontal"
      showsIndicators={false}
      modifiers={[listRowInsets({ top: 10, bottom: 10, leading: 0, trailing: 0 })]}
    >
      <HStack spacing={8} modifiers={[padding({ horizontal: 16 })]}>
        {categories.map((cat) => {
          const selected = cat.id === selectedId;
          const color = cat.color_hex && HEX.test(cat.color_hex) ? cat.color_hex : "gray";
          return (
            <Button
              key={cat.id}
              onPress={() => onSelect(cat.id)}
              modifiers={[
                buttonStyle(selected ? "borderedProminent" : "bordered"),
                buttonBorderShape("capsule"),
                tint(color),
              ]}
            >
              <HStack spacing={6}>
                <Circle
                  modifiers={[
                    frame({ width: 8, height: 8 }),
                    foregroundStyle(selected ? "white" : color),
                  ]}
                />
                <SwiftText
                  modifiers={[
                    font({ weight: "semibold", size: 15 }),
                    foregroundStyle(
                      selected ? "white" : { type: "hierarchical", style: "primary" },
                    ),
                  ]}
                >
                  {cat.name ?? ""}
                </SwiftText>
              </HStack>
            </Button>
          );
        })}
      </HStack>
    </ScrollView>
  );
}
