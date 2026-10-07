"use client";

import { useEffect, useEffectEvent } from "react";

/**
 * Key → handler. Single keys use `KeyboardEvent.key` (letters lowercase,
 * e.g. "n", "ArrowDown", "Escape"); "Mod+Enter" is ⌘↵ / Ctrl+↵. A handler
 * returns `false` when it didn't act, so the key keeps its default.
 */
export type Hotkeys = Record<string, (event: KeyboardEvent) => boolean | void>;

/** Fields where single keys are typing, not shortcuts. */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
}

/** An open Radix menu or popover handles its own keys (Esc closes it first). */
function isPopperOpen() {
  return !!document.querySelector("[data-radix-popper-content-wrapper]");
}

/**
 * Window-level keyboard shortcuts (desktop). Single keys are ignored while
 * typing in a field, with ⌘/Ctrl/Alt held, during IME composition or while
 * a menu or popover is open. "Mod+Enter" and Escape also work from inside
 * a field, so the form can be submitted or closed while typing (as in the
 * mobile sheets).
 */
export function useHotkeys(hotkeys: Hotkeys, enabled = true) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || isPopperOpen()) return;

    let name: string;
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.altKey) {
      name = "Mod+Enter";
    } else {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== "Escape" && isTypingTarget(event.target)) return;
      name = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    }

    const handler = hotkeys[name];
    if (handler && handler(event) !== false) event.preventDefault();
  });

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
