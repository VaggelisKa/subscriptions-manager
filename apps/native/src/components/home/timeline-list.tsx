import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { router } from "expo-router";
import type { SubscriptionWithCategory } from "@subscriptions-manager/shared";
import { Group, SectionHeader } from "@/components/ui/grouped";
import { SubscriptionRow } from "@/components/subscription-row";
import { bucketByTime, scheduleSubscriptions } from "@/lib/billing";
import { formatWholeKr } from "@/lib/format";

type Props = {
  subscriptions: SubscriptionWithCategory[];
};

/** Subscriptions grouped into "Next 7 days", "Later this month" and "Later". */
export function TimelineList({ subscriptions }: Props) {
  const buckets = bucketByTime(scheduleSubscriptions(subscriptions));

  return buckets.map((bucket) => (
    <Animated.View
      key={bucket.key}
      layout={LinearTransition}
      entering={FadeIn}
      exiting={FadeOut}
    >
      <SectionHeader
        title={bucket.title}
        trailing={formatWholeKr(
          bucket.items.reduce((acc, i) => acc + (i.subscription.price ?? 0), 0),
        )}
      />
      <Group>
        {bucket.items.map(({ subscription, nextCharge }) => (
          <Animated.View key={subscription.id} layout={LinearTransition}>
            <SubscriptionRow
              subscription={subscription}
              nextCharge={nextCharge}
              onPress={() =>
                router.push({
                  pathname: "/subscription/[id]",
                  params: { id: subscription.id },
                })
              }
            />
          </Animated.View>
        ))}
      </Group>
    </Animated.View>
  ));
}
