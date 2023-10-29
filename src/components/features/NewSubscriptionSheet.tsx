import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewSubscriptionForm } from "./NewSubscriptionForm";

export function NewSubscriptionSheet({
  children,
}: {
  children?: React.ReactNode;
}) {
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

        <NewSubscriptionForm />
      </SheetContent>
    </Sheet>
  );
}
