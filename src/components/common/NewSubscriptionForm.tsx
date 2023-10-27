"use client";

import { Label } from "@radix-ui/react-label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Input } from "@/components/ui/input";
import { SheetFooter, SheetClose } from "@/components/ui/sheet";
import { addNewSubscription } from "@/lib/actions";
import { useToast } from "@/lib/hooks/useToast";

export function NewSubscriptionForm() {
  const { toast } = useToast();

  return (
    <form
      className="mt-8 flex flex-col gap-4"
      action={async (formData) => {
        const res = await addNewSubscription(formData);

        if (res?.message) {
          toast({
            title: "An error has occurred while savings your subscription",
            description: res.message,
            variant: "destructive",
            "aria-live": "assertive",
          });
        }
      }}
    >
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
  );
}
