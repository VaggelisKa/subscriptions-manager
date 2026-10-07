"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ToolbarButton } from "@/components/ui/toolbar-button";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible title; shown in the header unless `hideTitle`. */
  title: string;
  hideTitle?: boolean;
  description?: string;
  /** Buttons on the right of the header (Edit, Save, …). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * The native form sheet, on the web: a card that slides up from the bottom
 * on phones (with a grabber, inset from the screen edges) and a centred
 * modal card on larger screens. Header: a round close button on the left,
 * the title in the middle, actions on the right.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  description,
  actions,
  children,
  className,
}: SheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          ref={contentRef}
          {...(description ? {} : { "aria-describedby": undefined })}
          // Don't move focus into the sheet's fields on open: on phones that
          // pops the keyboard up before the sheet has even finished sliding
          // in. Focus the sheet itself instead so screen readers and keyboard
          // users still land inside the dialog; tap a field when ready.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            contentRef.current?.focus({ preventScroll: true });
          }}
          className={cn(
            "fixed inset-x-2 bottom-2 z-50 flex max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-sheet bg-background shadow-sheet outline-none",
            "data-[state=open]:animate-sheet-up data-[state=closed]:animate-sheet-down",
            "sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[min(780px,calc(100dvh-4rem))] sm:w-full sm:max-w-[480px]",
            "sm:data-[state=open]:animate-in sm:data-[state=closed]:animate-out sm:data-[state=closed]:fade-out-0 sm:data-[state=open]:fade-in-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
            "motion-reduce:animate-none sm:motion-reduce:animate-none",
            className,
          )}
        >
          <div aria-hidden className="mx-auto mt-1.5 h-[5px] w-9 shrink-0 rounded-full bg-faint/60 sm:hidden" />
          <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-2 pt-2.5 sm:pt-4">
            <DialogPrimitive.Close asChild>
              <ToolbarButton aria-label="Close" className="justify-self-start">
                <X strokeWidth={2.25} />
              </ToolbarButton>
            </DialogPrimitive.Close>
            {hideTitle ? (
              <span aria-hidden />
            ) : (
              <DialogPrimitive.Title className="truncate text-center text-[17px] font-extrabold leading-[22px]">
                {title}
              </DialogPrimitive.Title>
            )}
            <div className="flex items-center gap-2 justify-self-end">{actions}</div>
          </header>
          {hideTitle ? <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title> : null}
          {description ? (
            <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
