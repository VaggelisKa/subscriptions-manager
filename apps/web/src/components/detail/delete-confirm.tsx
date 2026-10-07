"use client";

import { useId, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { deleteSubscription } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  name: string;
  onCancel: () => void;
  onDeleted: () => void;
  /** Esc cancels while focus is inside (the desktop inspector; sheets close on Esc instead). */
  cancelOnEscape?: boolean;
  className?: string;
};

/** Inline confirmation before deleting, in place of the native alert. */
export function DeleteConfirm({ id, name, onCancel, onDeleted, cancelOnEscape = false, className }: Props) {
  const labelId = useId();
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function handleDelete() {
    setError(null);
    startDelete(async () => {
      const data = new FormData();
      data.set("id", id);
      const result = await deleteSubscription(data);
      if (result?.success) onDeleted();
      else setError(result?.message ?? "Couldn't delete the subscription. Try again.");
    });
  }

  return (
    <div
      role="group"
      aria-labelledby={`${labelId}-title`}
      aria-describedby={`${labelId}-desc`}
      onKeyDown={
        cancelOnEscape
          ? (event) => {
              if (event.key !== "Escape" || deleting) return;
              event.preventDefault();
              onCancel();
            }
          : undefined
      }
      className={cn("rounded-xl bg-surface p-4", className)}
    >
      <p id={`${labelId}-title`} className="text-headline">
        Delete &ldquo;{name}&rdquo;?
      </p>
      <p id={`${labelId}-desc`} className="mt-1 text-[15px] leading-5 text-muted-foreground">
        It&apos;s removed from your list and totals. This can&apos;t be undone.
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-[14px] font-semibold text-destructive">
          {error}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          disabled={deleting}
          className="h-11 rounded-md bg-fill text-[16px] font-bold transition-transform active:scale-[0.98]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex h-11 items-center justify-center rounded-md bg-destructive text-[16px] font-extrabold text-destructive-foreground transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {deleting ? <Loader2 aria-label="Deleting" className="size-5 animate-spin" /> : "Delete"}
        </button>
      </div>
    </div>
  );
}
