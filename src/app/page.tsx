import { AddNewSubscriptionButton } from "@/components/common/AddNewSubscriptionButton";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex flex-col gap-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Welcome, user</h1>
          <AddNewSubscriptionButton />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Total costs</CardTitle>
            <CardDescription>
              Aggregation of all your subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold">$180,33</span>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Charged soon</h2>
        </div>

        <ul className="flex gap-2 overflow-x-scroll">
          <li className="max-w-[150px]">
            <Card>
              <CardHeader>
                <CardTitle>Netflix</CardTitle>
                <CardDescription>In 3 days</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-semibold">$12,99</span>
              </CardContent>
            </Card>
          </li>

          <li className="max-w-[150px]">
            <Card>
              <CardHeader>
                <CardTitle>Netflix</CardTitle>
                <CardDescription>in 2 months</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-semibold">$12,99</span>
              </CardContent>
            </Card>
          </li>

          <li className="max-w-[150px]">
            <Card>
              <CardHeader>
                <CardTitle>Netflix</CardTitle>
                <CardDescription>in 2 months</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-semibold">$12,99</span>
              </CardContent>
            </Card>
          </li>

          <li className="max-w-[150px]">
            <Card>
              <CardHeader>
                <CardTitle>Netflix</CardTitle>
                <CardDescription>in 2 months</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-semibold">$12,99</span>
              </CardContent>
            </Card>
          </li>
        </ul>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">All subscriptions</h2>
        </div>

        <ul className="flex flex-col gap-2">
          <li>
            <Card>
              <CardContent className="p-4">
                <div className=" flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Youtube premium
                    </p>
                    <p className="text-sm text-muted-foreground">24/4/2024</p>
                  </div>
                  <span>14,33$</span>
                </div>
              </CardContent>
            </Card>
          </li>

          <li>
            <Card className="border-l-2 border-l-green-400">
              <CardContent className="my-auto p-4">
                <div className=" flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Netflix</p>
                    <p className="text-sm text-muted-foreground">24/4/2024</p>
                  </div>
                  <span>14,33$</span>
                </div>
              </CardContent>
            </Card>
          </li>

          <li>
            <Card className="border-l-2 border-l-red-400">
              <CardContent className="my-auto  p-4">
                <div className=" flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">wolt</p>
                    <p className="text-sm text-muted-foreground">24/4/2024</p>
                  </div>
                  <span>234.32,33$</span>
                </div>
              </CardContent>
            </Card>
          </li>
        </ul>
      </section>
    </main>
  );
}
