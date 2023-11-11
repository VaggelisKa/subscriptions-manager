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
import { isPast } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import NotFoundImage from "public/not-found.svg";
import { DarkModeToggle } from "@/components/features/DarkModeToggle";
import { SubscriptionGroupSwitchForm } from "@/components/features/SubscriptionGroupSwitch";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Your subscriptions",
  description: "Overview of your subscriptions",
};

function NoSubscriptions({ categories }: { categories: Category[] }) {
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
        >
          <SubscriptionForm categories={categories || []} />
        </SubscriptionSheet>
      </div>
    </section>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: NextURLSearchParams;
}) {
  const supabase = getSupabaseServerClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, name, price, billed_at, interval, description, categories(*)")
    .order("billed_at", { ascending: true });

  const { data: categories } = await supabase.from("categories").select("*");

  if (!subscriptions?.length) {
    return <NoSubscriptions categories={categories || []} />;
  }

  const subscriptionsSum = subscriptions.reduce((acc, curr) => {
    return acc + (curr?.price || 0);
  }, 0);

  const monthlySubscriptionsSum = subscriptions.reduce((acc, curr) => {
    return curr.interval === "month" ? acc + (curr?.price || 0) : acc;
  }, 0);

  const subscriptionsWithoutExpired = subscriptions.filter(
    ({ billed_at }) => !isPast(utcToZonedTime(billed_at, "Europe/Copenhagen")),
  );

  let groupedSubscriptions: {
    [key: string]: SubscriptionWithCategory[];
  } | null = null;

  let groupedCategoryTotal: { [key: string]: number } | null = null;

  if (searchParams.group === "category") {
    groupedSubscriptions = subscriptions.reduce(
      (acc, curr) => {
        const category = curr.categories?.name || "Other";

        if (!acc[category]) {
          acc[category] = [];
        }

        acc[category].push(curr as SubscriptionWithCategory);

        return acc;
      },
      {} as { [key: string]: SubscriptionWithCategory[] },
    );

    groupedCategoryTotal = Object.keys(groupedSubscriptions).reduce(
      (acc, curr) => {
        const total = groupedSubscriptions?.[curr].reduce((acc, curr) => {
          return acc + (curr?.price || 0);
        }, 0);

        acc[curr] = total ?? 0;

        return acc;
      },
      {} as { [key: string]: number },
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Overview</h1>
          <div className="flex gap-2">
            <SubscriptionSheet>
              <SubscriptionForm categories={categories || []} />
            </SubscriptionSheet>
            <DarkModeToggle />
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

      {subscriptionsWithoutExpired.length > 2 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Charged soon</h2>
          </div>

          <ul className="flex gap-2 overflow-x-scroll md:grid md:grid-cols-3 md:overflow-x-auto">
            {subscriptionsWithoutExpired
              .slice(0, 3)
              ?.map(({ id, name, price, billed_at }) => (
                <li key={id} className="max-w-[200px] md:max-w-[unset]">
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
        <div className="mb-4 flex flex-col ">
          <h2 className="text-2xl font-bold">All subscriptions</h2>
          <SubscriptionGroupSwitchForm />
        </div>

        <ul className="flex flex-col gap-2">
          {!!groupedSubscriptions
            ? Object.keys(groupedSubscriptions).map((category) => (
                <div key={category}>
                  <div className="mb-1 flex items-center justify-between">
                    <div>{category}</div>
                    {groupedCategoryTotal !== null && (
                      <span className="text-xs text-foreground">
                        {groupedCategoryTotal[category].toLocaleString(
                          "en-DK",
                          {
                            ...numberFormatOptions,
                            maximumFractionDigits: 0,
                            minimumFractionDigits: 0,
                          },
                        )}
                      </span>
                    )}
                  </div>

                  {groupedSubscriptions![category].map((subscription) => (
                    <li className="mb-2" key={`all-grouped-${subscription.id}`}>
                      <SubscriptionSheet
                        customTrigger={
                          <SubscriptionCard subscription={subscription} />
                        }
                        isEditMode
                        triggerAsChild={false}
                      >
                        <SubscriptionForm
                          subscription={subscription}
                          categories={categories || []}
                        />
                      </SubscriptionSheet>
                    </li>
                  ))}
                </div>
              ))
            : subscriptions.map((subscription) => (
                <li key={`all-${subscription.id}`}>
                  <SubscriptionSheet
                    customTrigger={
                      <SubscriptionCard subscription={subscription} />
                    }
                    isEditMode
                    triggerAsChild={false}
                  >
                    <SubscriptionForm
                      subscription={subscription}
                      categories={categories || []}
                    />
                  </SubscriptionSheet>
                </li>
              ))}
        </ul>
      </section>
    </div>
  );
}
