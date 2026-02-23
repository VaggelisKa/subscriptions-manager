"use client";

import { useMemo } from "react";
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
import {
  addNewSubscription,
  deleteSubscription,
  updateSubscription,
} from "@/lib/actions";
import { useToast } from "@/lib/hooks/useToast";

// Cross check over-sharing of DB (in the future)
type SubscriptionFormProps = {
  subscription?: Partial<SubscriptionWithCategory>;
  categories: Category[];
};

export function SubscriptionForm({
  subscription,
  categories,
}: SubscriptionFormProps) {
  const isEditMode = useMemo(() => !!subscription, [subscription]);
  const { toast } = useToast();

  return (
    <form
      className="mt-8 flex flex-col gap-4"
      action={async (formData) => {
        const res = await (isEditMode
          ? updateSubscription(formData)
          : addNewSubscription(formData));

        if (res?.message) {
          toast({
            title: "An error has occurred while saving your subscription",
            description: res.message,
            variant: "destructive",
            "aria-live": "assertive",
          });
        }

        if (res?.success) {
          toast({
            title: isEditMode ? "Subscription updated" : "Subscription saved",
            description: "Your subscription has been saved successfully",
            variant: "success",
            "aria-live": "polite",
          });
        }
      }}
    >
      {isEditMode && (
        <input
          name="id"
          defaultValue={subscription?.id}
          type="text"
          hidden
          aria-hidden
        />
      )}

      <fieldset className="flex flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            defaultValue={subscription?.name ?? ""}
            name="name"
            placeholder="Netflix"
          ></Input>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            defaultValue={subscription?.description ?? ""}
            name="description"
            placeholder="Shared netflix account"
          ></Input>
        </div>

        <div>
          <Label htmlFor="interval">Category</Label>
          <Select
            defaultValue={subscription?.categories?.id ?? undefined}
            name="category"
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Categories</SelectLabel>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center justify-start gap-2">
                      <span
                        style={{ backgroundColor: category.color_hex }}
                        className="h-3 w-3 rounded-full"
                      />{" "}
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </fieldset>

      <fieldset className="flex w-full gap-4">
        <div>
          <Label htmlFor="price">Price</Label>
          <Input
            defaultValue={subscription?.price ?? ""}
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
          <Select defaultValue={subscription?.interval} name="interval">
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
        <DatePicker
          defaultValue={
            !!subscription?.billed_at
              ? new Date(subscription.billed_at)
              : undefined
          }
          disablePastDates
        />
      </fieldset>

      <SheetFooter className="mt-4 flex flex-col gap-2">
        <SheetClose asChild>
          <Button type="submit">{isEditMode ? "Update" : "Add"}</Button>
        </SheetClose>

        {isEditMode && (
          <SheetClose asChild>
            <Button
              type="submit"
              formAction={async (formData) => {
                const res = await deleteSubscription(formData);

                if (res?.message) {
                  toast({
                    title:
                      "An error has occurred while deleting your subscription",
                    description: "please try again later",
                    variant: "destructive",
                    "aria-live": "assertive",
                  });
                }

                if (res?.success) {
                  toast({
                    title: "Subscription deleted",
                    description:
                      "Your subscription has been deleted successfully",
                    variant: "success",
                    "aria-live": "polite",
                  });
                }
              }}
              variant="destructive"
            >
              Delete
            </Button>
          </SheetClose>
        )}

        <SheetClose asChild>
          <Button className="w-full" variant="secondary" type="button">
            Cancel
          </Button>
        </SheetClose>
      </SheetFooter>
    </form>
  );
}
