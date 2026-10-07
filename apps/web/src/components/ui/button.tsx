"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Native button styles (`apps/native/src/components/auth/button.tsx`):
 * full-height 52px, 16px corners, a press that scales to 0.98.
 * - primary: orange fill, white text
 * - secondary: translucent fill, foreground text
 * - plain: no fill, orange text
 */
const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap transition-[transform,opacity,background-color] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-button font-extrabold text-primary-foreground hover:bg-primary-button-hover active:bg-primary-button-active",
        secondary: "bg-fill font-bold text-foreground hover:opacity-80",
        plain: "font-bold text-primary-text hover:opacity-70",
        destructive: "font-bold text-destructive hover:opacity-70",
        // Used by the calendar's day and navigation cells.
        ghost: "font-semibold hover:bg-fill",
        outline: "font-semibold hover:bg-fill",
      },
      size: {
        default: "h-[52px] w-full rounded-lg px-5 text-[16.5px]",
        sm: "h-9 rounded-md px-3 text-subhead",
        icon: "h-8 w-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
