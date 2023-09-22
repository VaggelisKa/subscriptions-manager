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
    <main>
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
    </main>
  );
}
