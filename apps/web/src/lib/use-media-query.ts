"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a media query matches. `false` on the server and during hydration,
 * so anything gated on it renders after mount without a mismatch.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
