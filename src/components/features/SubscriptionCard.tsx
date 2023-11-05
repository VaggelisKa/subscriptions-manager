import { getShortDateFromTimestamp } from "@/lib/dates";
import { Card, CardContent } from "@/components/ui/card";
import { numberFormatOptions } from "@/lib/constants";

export function SubscriptionCard({
  subscription,
}: {
  subscription: Partial<SubscriptionWithCategory>;
}) {
  return (
    <Card
      style={
        subscription.categories?.color_hex
          ? {
              borderLeftColor: subscription.categories.color_hex,
              borderLeftWidth: "2px",
            }
          : {}
      }
      className="hover:bg-muted"
    >
      <CardContent className="my-auto p-4">
        <div className=" flex items-center justify-between">
          <div className="flex flex-col items-start justify-start">
            <p className="text-sm font-medium leading-none">
              {subscription.name}
            </p>
            {!!subscription.categories?.name && (
              <span className="translate-y-1 text-sm text-muted-foreground">
                {subscription.categories.name}
              </span>
            )}
          </div>

          <div className="flex flex-col justify-end">
            <span>
              {subscription.price?.toLocaleString("en-DK", numberFormatOptions)}
            </span>
            <span className="text-end text-sm text-muted-foreground">
              {getShortDateFromTimestamp(subscription.billed_at ?? "")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
