import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type SubscriptionSheetProps = {
  children: React.ReactNode;
  customTrigger?: React.ReactNode;
  isEditMode?: boolean;
  triggerAsChild?: boolean;
};

export function SubscriptionSheet({
  children,
  customTrigger,
  isEditMode,
  triggerAsChild = true,
}: SubscriptionSheetProps) {
  return (
    <Sheet>
      <SheetTrigger
        className={
          triggerAsChild
            ? ""
            : "h-full w-full rounded-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        }
        asChild={triggerAsChild}
      >
        {customTrigger ? (
          customTrigger
        ) : (
          <Button variant="outline" size="icon">
            <span className="sr-only">
              {isEditMode ? "Modify your subscription" : "Add new subscription"}
            </span>
            <Plus className="h-6 w-6" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? "Modify your subscription" : "Add a new subscription"}
          </SheetTitle>
        </SheetHeader>

        {children}
      </SheetContent>
    </Sheet>
  );
}
