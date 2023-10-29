import { getShortDateFromTimestamp } from "@/lib/dates";
import { Card, CardContent } from "@/components/ui/card";
import { numberFormatOptions } from "@/lib/constants";

export function SubscriptionCard({
  subscription,
}: {
  subscription: Partial<Subscription>;
}) {
  return (
    <Card>
      <CardContent className="my-auto p-4">
        <div className=" flex items-center justify-between">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">
              {subscription.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {getShortDateFromTimestamp(subscription.billed_at ?? "")}
            </p>
          </div>
          <span>
            {subscription.price?.toLocaleString("en-DK", numberFormatOptions)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
