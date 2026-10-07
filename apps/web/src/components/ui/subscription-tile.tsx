import type { CSSProperties } from "react";
import { findBrand } from "@/lib/brands";
import { cn } from "@/lib/utils";

const HEX = /^#[0-9a-f]{6}$/i;

type Props = {
  name: string | null | undefined;
  /** Category colour (`#RRGGBB`); falls back to a neutral tile. */
  color: string | null | undefined;
  size?: number;
  className?: string;
};

/**
 * The logo for well-known subscriptions (see `findBrand`), otherwise a
 * monogram tile: the first letter on a tint of the category colour.
 */
export function SubscriptionTile({ name, color, size = 40, className }: Props) {
  const brand = findBrand(name);
  const box: CSSProperties = {
    width: size,
    height: size,
    borderRadius: size * 0.3,
  };

  if (brand) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center dark:ring-[0.5px] dark:ring-inset dark:ring-white/20",
          className,
        )}
        style={{ ...box, backgroundColor: brand.color }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG glyph */}
        <img
          src={brand.icon}
          alt=""
          width={Math.round(size * 0.55)}
          height={Math.round(size * 0.55)}
          draggable={false}
        />
      </span>
    );
  }

  const letter = name?.trim().charAt(0).toUpperCase() || "?";
  const hasColor = !!color && HEX.test(color);

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center font-black",
        hasColor ? "tile-tint" : "bg-fill text-muted-foreground",
        className,
      )}
      style={{
        ...box,
        fontSize: Math.round(size * 0.44),
        ...(hasColor ? ({ "--tile": color, color } as CSSProperties) : {}),
      }}
    >
      {letter}
    </span>
  );
}
