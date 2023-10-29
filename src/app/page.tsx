import { LogoutButton } from "@/components/features/LogoutButton";
import { SubscriptionCard } from "@/components/features/SubscriptionCard";
import { SubscriptionForm } from "@/components/features/SubscriptionForm";
import { SubscriptionSheet } from "@/components/features/SubscriptionSheet";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { numberFormatOptions } from "@/lib/constants";
import { getRelativeDateFromTimestamp } from "@/lib/dates";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import NotFoundImage from "public/not-found.svg";

function NoSubscriptions() {
  return (
    <section className="flex w-full justify-center">
      <div className="flex flex-col items-center justify-center gap-6 md:max-w-2xl">
        <p className="text-2xl font-bold">No subscriptions</p>
        <Image
          className="object-fill"
          src={NotFoundImage}
          height={200}
          alt=""
        />
        <p className="text-center text-muted-foreground">
          You do not have any subscriptions yet. <br />
          Add one to get started!
        </p>
        <SubscriptionSheet
          customTrigger={<Button className="w-full">Add your first one</Button>}
        />
      </div>
    </section>
  );
}

export default async function Home() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, name, price, billed_at, interval, description")
    .order("billed_at", { ascending: true });

  if (!subscriptions?.length) {
    return <NoSubscriptions />;
  }

  const subscriptionsSum = subscriptions.reduce((acc, curr) => {
    return acc + (curr?.price || 0);
  }, 0);

  const monthlySubscriptionsSum = subscriptions.reduce((acc, curr) => {
    return curr.interval === "month" ? acc + (curr?.price || 0) : acc;
  }, 0);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Overview</h1>
          <div className="flex gap-2">
            <SubscriptionSheet />
            <LogoutButton />
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Total costs</CardTitle>
            <CardDescription>
              Aggregation of all your subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold">
              {subscriptionsSum?.toLocaleString("en-DK", {
                ...numberFormatOptions,
                notation: "standard",
              })}
            </span>

            {monthlySubscriptionsSum > 0 && (
              <p className="mt-[6px] text-sm font-semibold">
                {monthlySubscriptionsSum.toLocaleString("en-DK", {
                  ...numberFormatOptions,
                  notation: "standard",
                  minimumFractionDigits: 0,
                })}{" "}
                <span className="font-normal text-muted-foreground">
                  of which is monthly
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {subscriptions.length > 2 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Charged soon</h2>
          </div>

          <ul className="flex gap-2 overflow-x-scroll md:overflow-x-auto">
            {subscriptions
              .slice(0, 3)
              ?.map(({ id, name, price, billed_at }) => (
                <li key={id} className="max-w-[200px] md:max-w-[250px]">
                  <Card>
                    <CardHeader>
                      <CardTitle className="whitespace-nowrap">
                        {name}
                      </CardTitle>
                      <CardDescription>
                        {getRelativeDateFromTimestamp(billed_at ?? "")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="text-2xl font-semibold">
                        {price?.toLocaleString("en-DK", {
                          ...numberFormatOptions,
                          maximumFractionDigits: 0,
                          minimumFractionDigits: 0,
                        })}
                      </span>
                    </CardContent>
                  </Card>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">All subscriptions</h2>
        </div>

        <ul className="flex flex-col gap-2">
          {subscriptions.map((subscription) => (
            <li key={`all-${subscription.id}`}>
              <SubscriptionSheet
                customTrigger={<SubscriptionCard subscription={subscription} />}
                isEditMode
              >
                <SubscriptionForm subscription={subscription} />
              </SubscriptionSheet>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
