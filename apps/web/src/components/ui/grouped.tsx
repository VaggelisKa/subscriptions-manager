import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type GroupProps = {
  children: ReactNode;
  /** Left inset of the separators between rows (aligns with row text). */
  separatorInset?: number;
  className?: string;
  as?: "div" | "ul";
};

/** Raised, rounded container for rows, with inset hairline separators. */
export function Group({
  children,
  separatorInset = 68,
  className,
  as: Tag = "div",
}: GroupProps) {
  const items = Children.toArray(children);
  const Item = Tag === "ul" ? "li" : Fragment;

  return (
    <Tag className={cn("overflow-hidden rounded-xl bg-surface", className)}>
      {items.map((child, i) => (
        <Item key={isValidElement(child) && child.key != null ? child.key : i}>
          {i > 0 && (
            <div
              aria-hidden
              className="h-px bg-separator"
              style={{ marginLeft: separatorInset }}
            />
          )}
          {child}
        </Item>
      ))}
    </Tag>
  );
}

type SectionHeaderProps = {
  title: string;
  /** Muted text on the right, e.g. a section total. */
  trailing?: string;
  as?: "h2" | "h3";
  id?: string;
};

export function SectionHeader({
  title,
  trailing,
  as: Heading = "h2",
  id,
}: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between px-1.5 pb-2 pt-6">
      <Heading id={id} className="text-section text-foreground">
        {title}
      </Heading>
      {trailing ? (
        <span className="text-footnote tabular-nums text-muted-foreground">
          {trailing}
        </span>
      ) : null}
    </div>
  );
}
