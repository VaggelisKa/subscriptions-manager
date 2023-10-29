import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionForm } from "./SubscriptionForm";

type SubscriptionSheetProps = {
  customTrigger?: React.ReactNode;
  children?: React.ReactNode;
  isEditMode?: boolean;
};

export function SubscriptionSheet({
  children,
  customTrigger,
  isEditMode,
}: SubscriptionSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {customTrigger ? (
          customTrigger
        ) : (
          <Button variant="outline" size="icon">
            <span className="sr-only">
              {isEditMode ? "Update your subscription" : "Add new subscription"}
            </span>
            <Plus className="h-6 w-6" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? "Update your subscription" : "Add a new subscription"}
          </SheetTitle>
        </SheetHeader>

        {children ? children : <SubscriptionForm />}
      </SheetContent>
    </Sheet>
  );
}
