"use client";

import { Sheet } from "@/components/ui/sheet";
import { SubscriptionForm } from "@/components/form/subscription-form";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The subscription being edited; a new one when absent. */
  subscription?: SubscriptionWithCategory;
  /** Prefilled name for a new subscription (quick add). */
  initialName?: string;
  categories: Category[];
  onSaved: () => void;
  onDeleted: () => void;
};

/**
 * Add / edit as a form sheet, like the native SwiftUI form: a live preview,
 * then Details (name, category), Price and Billed (interval, next charge).
 * Save is the orange check in the header.
 */
export function SubscriptionFormSheet({
  open,
  onOpenChange,
  subscription,
  initialName,
  categories,
  onSaved,
  onDeleted,
}: Props) {
  return (
    <SubscriptionForm
      variant="sheet"
      subscription={subscription}
      initialName={initialName}
      categories={categories}
      onSaved={() => onSaved()}
      onDeleted={onDeleted}
    >
      {({ title, actions, content }) => (
        <Sheet open={open} onOpenChange={onOpenChange} title={title} actions={actions}>
          {content}
        </Sheet>
      )}
    </SubscriptionForm>
  );
}
