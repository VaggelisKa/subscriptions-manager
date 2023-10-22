import { LogoutButton } from "@/components/common/LogoutButton";
import { NewSubscriptionSheet } from "@/components/common/NewSubscriptionSheet";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getRelativeDateFromTimestamp,
  getShortDateFromTimestamp,
} from "@/lib/dates";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const numberFormatOptions: Intl.NumberFormatOptions = {
  currency: "DKK",
  style: "currency",
  compactDisplay: "short",
  notation: "compact",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
};

export default async function Home() {
  const supabase = createServerComponentClient<Database>({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, name, price, billed_at")
    .order("billed_at", { ascending: true });

  const subscriptionsSum = subscriptions?.reduce((acc, curr) => {
    return acc + (curr?.price || 0);
  }, 0);

  return (
    <main className="flex flex-col gap-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Overview</h1>
          <div className="flex gap-2">
            <NewSubscriptionSheet />
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
              {subscriptionsSum?.toLocaleString("en-DK", numberFormatOptions)}
            </span>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Charged soon</h2>
        </div>

        <ul className="flex gap-2 overflow-x-scroll md:overflow-x-auto">
          {subscriptions?.map(({ id, name, price, billed_at }) => (
            <li key={id} className="max-w-[200px] md:max-w-[250px]">
              <Card>
                <CardHeader>
                  <CardTitle className="whitespace-nowrap">{name}</CardTitle>
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

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">All subscriptions</h2>
        </div>

        <ul className="flex flex-col gap-2">
          {subscriptions?.map(({ id, name, billed_at, price }) => (
            <li key={`all-${id}`}>
              <Card>
                <CardContent className="my-auto p-4">
                  <div className=" flex items-center justify-between">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getShortDateFromTimestamp(billed_at ?? "")}
                      </p>
                    </div>
                    <span>
                      {price?.toLocaleString("en-DK", numberFormatOptions)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
