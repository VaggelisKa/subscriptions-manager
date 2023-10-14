import { AddNewSubscriptionButton } from "@/components/common/AddNewSubscriptionButton";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
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
      </section>
    </main>
  );
}
