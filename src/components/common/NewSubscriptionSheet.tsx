import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/datepicker";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export function NewSubscriptionSheet({
  children,
}: {
  children?: React.ReactNode;
}) {
  async function handleSubmit(data: FormData) {
    "use server";

    const supabase = createServerComponentClient<Database>({ cookies });
    const inputs = Object.fromEntries(data) as {
      name: string;
      description: string;
      price: string;
      interval: "week" | "month" | "year";
      billed_at: string;
    };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not found");

    const { error } = await supabase.from("subscriptions").insert({
      name: inputs.name,
      description: inputs.description,
      price: parseFloat(inputs.price),
      interval: inputs.interval,
      billed_at: new Date(inputs.billed_at).toISOString(),
      user_id: user.id,
    });

    console.log(error);

    revalidatePath("/");
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children ? (
          children
        ) : (
          <Button variant="outline" size="icon">
            <span className="sr-only">Add new subscription</span>
            <Plus className="h-6 w-6" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Add a new subscription</SheetTitle>
        </SheetHeader>

        <form className="mt-8 flex flex-col gap-4" action={handleSubmit}>
          <fieldset className="flex flex-col gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input name="name" placeholder="Netflix"></Input>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                name="description"
                placeholder="Shared netflix account"
              ></Input>
            </div>
          </fieldset>

          <fieldset className="flex w-full gap-4">
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                name="price"
                className="flex-grow-0"
                placeholder="0,00"
                type="number"
                step="0.01"
                pattern="^\d+(?:\.\d{1,2})?$"
              ></Input>
            </div>

            <div className="flex-shrink-0 flex-grow">
              <Label htmlFor="interval">Interval</Label>
              <Select name="interval">
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Intervals</SelectLabel>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </fieldset>

          <fieldset>
            <Label htmlFor="billed_at">Billing Date</Label>
            <DatePicker />
          </fieldset>

          <SheetFooter className="mt-4 flex flex-col gap-2">
            <SheetClose asChild>
              <Button type="submit">Add Subscription</Button>
            </SheetClose>

            <SheetClose asChild>
              <Button className="w-full" variant="secondary" type="button">
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
