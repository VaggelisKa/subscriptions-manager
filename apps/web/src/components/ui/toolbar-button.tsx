import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** `prominent` is the orange confirm button (Save); `glass` floats over content. */
  variant?: "glass" | "prominent" | "bare";
};

/**
 * The round 44px buttons of the native toolbar. Icon-only buttons need an
 * `aria-label`; buttons with a text label grow into a pill.
 */
export const ToolbarButton = forwardRef<HTMLButtonElement, Props>(
  function ToolbarButton({ className, variant = "glass", type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex h-11 min-w-11 select-none items-center justify-center rounded-full px-2.5 text-[17px] font-semibold transition-[transform,opacity,background-color] duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[22px] [&_svg]:shrink-0",
          variant === "glass" && "glass text-foreground shadow-float",
          variant === "prominent" && "bg-primary-button text-primary-foreground shadow-float hover:bg-primary-button-hover active:bg-primary-button-active",
          variant === "bare" && "text-foreground hover:bg-fill",
          className,
        )}
        {...props}
      />
    );
  },
);

/** Several toolbar buttons sharing one glass capsule, like native toolbar groups. */
export function ToolbarGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("glass flex items-center rounded-full px-1 shadow-float", className)}>
      {children}
    </div>
  );
}
