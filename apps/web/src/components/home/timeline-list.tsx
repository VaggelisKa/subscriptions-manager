import { Group, SectionHeader } from "@/components/ui/grouped";
import { SubscriptionRow } from "@/components/subscription-row";
import { bucketByTime, scheduleSubscriptions } from "@subscriptions-manager/shared/billing";
import { formatWholeKr } from "@subscriptions-manager/shared/format";

type Props = {
  subscriptions: SubscriptionWithCategory[];
  onSelect: (id: string) => void;
};

/** Subscriptions grouped into "Next 7 days", "Later this month" and "Later". */
export function TimelineList({ subscriptions, onSelect }: Props) {
  const buckets = bucketByTime(scheduleSubscriptions(subscriptions));

  return buckets.map((bucket) => (
    <section key={bucket.key} aria-labelledby={`bucket-${bucket.key}`}>
      <SectionHeader
        id={`bucket-${bucket.key}`}
        title={bucket.title}
        trailing={formatWholeKr(
          bucket.items.reduce((acc, i) => acc + (i.subscription.price ?? 0), 0),
        )}
      />
      <Group as="ul">
        {bucket.items.map(({ subscription, nextCharge }) => (
          <SubscriptionRow
            key={subscription.id}
            subscription={subscription}
            nextCharge={nextCharge}
            onSelect={() => onSelect(subscription.id)}
          />
        ))}
      </Group>
    </section>
  ));
}
