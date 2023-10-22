import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { DatePicker } from "../ui/datepicker";

export function NewSubscriptionSheet() {
  async function handleSubmit(data: FormData) {
    "use server";

    console.log(data);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <span className="sr-only">Add new subscription</span>
          <Plus className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="min-h-screen" side="bottom">
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
                placeholder="14"
                type="number"
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
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
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
            {/* <SheetClose>
            <Button type="submit">Save changes</Button>
            </SheetClose> */}
            <Button type="submit">Add Subscription</Button>

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
