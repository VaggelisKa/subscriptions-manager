import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function Home() {
  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome, user</h1>
        <Button variant="outline" size="icon">
          <span className="sr-only">Add new subscription</span>
          <Plus className="h-6 w-6" />
        </Button>
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
