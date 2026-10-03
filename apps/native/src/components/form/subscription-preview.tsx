import { HStack, RNHostView, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  background,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  shapes,
} from "@expo/ui/swift-ui/modifiers";
import type { IntervalEnum } from "@subscriptions-manager/shared";
import { useTheme } from "@/providers/theme-provider";
import { SubscriptionTile } from "@/components/ui/subscription-tile";
import { monthlyEquivalent, yearlyEquivalent } from "@/lib/billing";
import { findBrand } from "@/lib/brands";
import { formatNumber, formatWholeKr, intervalSuffix } from "@/lib/format";
import { fonts, withAlpha } from "@/lib/theme";

type Props = {
  name: string;
  /** Parsed price, or `null` while the field is empty or invalid. */
  price: number | null;
  interval: IntervalEnum;
  color: string | null | undefined;
};

const TILE = 44;
const HEX = /^#[0-9a-f]{6}$/i;

/**
 * What the subscription will look like in the list, updated as the form is
 * filled in. Built from SwiftUI views (not an RNHostView) so the Form measures
 * and truncates the text itself; hosted RN text overflowed the row. Only a
 * brand logo is hosted, since SwiftUI can't draw the bundled SVGs.
 */
export function SubscriptionPreview({ name, price, interval, color }: Props) {
  const { colors, colorScheme } = useTheme();
  const trimmed = name.trim();
  const hasColor = !!color && HEX.test(color);

  const perMonth = `≈ ${formatWholeKr(monthlyEquivalent(price ?? 0, interval))} a month`;
  const perYear = `${formatWholeKr(yearlyEquivalent(price ?? 0, interval))} a year`;
  const meta =
    price === null
      ? "Add a price to see the yearly cost"
      : interval === "month"
        ? perYear
        : interval === "year"
          ? perMonth
          : `${perMonth} · ${perYear}`;

  return (
    <HStack spacing={12}>
      {findBrand(trimmed) ? (
        <RNHostView matchContents>
          <SubscriptionTile name={trimmed} color={color} size={TILE} />
        </RNHostView>
      ) : (
        <Text
          modifiers={[
            font({ family: fonts.black, size: Math.round(TILE * 0.44) }),
            foregroundStyle(hasColor ? color : colors.mutedForeground),
            frame({ width: TILE, height: TILE }),
            background(
              withAlpha(
                color,
                colorScheme === "dark" ? 0.24 : 0.14,
                colors.fill,
              ),
              shapes.roundedRectangle({ cornerRadius: TILE * 0.3 }),
            ),
          ]}
        >
          {trimmed.charAt(0).toUpperCase() || "?"}
        </Text>
      )}
      <VStack alignment="leading" spacing={1}>
        <Text
          modifiers={[
            font({ family: fonts.bold, size: 17 }),
            lineLimit(1),
            foregroundStyle(trimmed ? colors.foreground : colors.faint),
          ]}
        >
          {trimmed || "New subscription"}
        </Text>
        <Text
          modifiers={[
            font({ family: fonts.semiBold, size: 13 }),
            lineLimit(1),
            foregroundStyle(colors.mutedForeground),
          ]}
        >
          {meta}
        </Text>
      </VStack>
      <Spacer />
      <HStack
        spacing={0}
        alignment="firstTextBaseline"
        modifiers={[layoutPriority(1)]}
      >
        <Text
          modifiers={[
            font({ family: fonts.extraBold, size: 18 }),
            lineLimit(1),
            foregroundStyle(price === null ? colors.faint : colors.foreground),
          ]}
        >
          {`${formatNumber(price ?? 0)} kr`}
        </Text>
        <Text
          modifiers={[
            font({ family: fonts.semiBold, size: 13 }),
            foregroundStyle(colors.mutedForeground),
          ]}
        >
          {intervalSuffix[interval]}
        </Text>
      </HStack>
    </HStack>
  );
}
