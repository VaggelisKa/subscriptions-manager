import { fonts, radius, spacing, themes, type ThemeColors } from "@/lib/theme";

export type DialogAction<T> = {
  label: string;
  value: T;
  variant: "cancel" | "default" | "destructive";
};

type DialogOptions<T> = {
  title: string;
  message?: string;
  /** Left to right. Focus starts on the first one. */
  actions: DialogAction<T>[];
  /** What Esc or a click outside the card resolves to. */
  dismissValue: T;
};

type ColorToken = {
  [K in keyof ThemeColors]: ThemeColors[K] extends string ? K : never;
}[keyof ThemeColors];

/**
 * A theme colour that follows the page's `color-scheme`. The dialog lives
 * outside the React tree (and its theme context), so it can't read the
 * current scheme directly.
 */
function token(name: ColorToken) {
  return `light-dark(${themes.light[name]}, ${themes.dark[name]})`;
}

let nextId = 0;

/**
 * Shows a modal alert dialog over the page, built from plain DOM so it can be
 * opened from anywhere (an event handler, an async callback) like
 * `Alert.alert`. Focus moves into it and is trapped there, Esc dismisses it,
 * and focus returns to where it was once it closes. Resolves with the value of
 * the chosen action.
 */
export function showDialog<T>({
  title,
  message,
  actions,
  dismissValue,
}: DialogOptions<T>): Promise<T> {
  const id = `app-dialog-${++nextId}`;
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const backdrop = document.createElement("div");
  Object.assign(backdrop.style, {
    position: "fixed",
    inset: "0",
    zIndex: "1000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: `${spacing.lg}px`,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  });

  const dialog = document.createElement("div");
  dialog.setAttribute("role", "alertdialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", `${id}-title`);
  if (message) dialog.setAttribute("aria-describedby", `${id}-message`);
  Object.assign(dialog.style, {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "360px",
    padding: `${spacing.lg}px`,
    borderRadius: `${radius.xl}px`,
    backgroundColor: token("surface"),
    color: token("foreground"),
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.25)",
  });

  const heading = document.createElement("h2");
  heading.id = `${id}-title`;
  heading.textContent = title;
  Object.assign(heading.style, {
    margin: "0",
    fontFamily: fonts.bold,
    fontWeight: "normal",
    fontSize: "16px",
    lineHeight: "21px",
  });
  dialog.append(heading);

  if (message) {
    const text = document.createElement("p");
    text.id = `${id}-message`;
    text.textContent = message;
    Object.assign(text.style, {
      margin: `${spacing.xs}px 0 0`,
      fontFamily: fonts.regular,
      fontSize: "15px",
      lineHeight: "20px",
      color: token("mutedForeground"),
    });
    dialog.append(text);
  }

  const row = document.createElement("div");
  Object.assign(row.style, {
    display: "grid",
    gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))`,
    gap: `${spacing.sm}px`,
    marginTop: `${spacing.lg}px`,
  });
  dialog.append(row);
  backdrop.append(dialog);

  return new Promise<T>((resolve) => {
    function close(value: T) {
      backdrop.remove();
      if (opener?.isConnected) opener.focus();
      resolve(value);
    }

    const buttons = actions.map((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      const filled = action.variant !== "cancel";
      Object.assign(button.style, {
        height: "44px",
        padding: `0 ${spacing.md}px`,
        border: "none",
        borderRadius: `${radius.md}px`,
        cursor: "pointer",
        fontFamily: filled ? fonts.extraBold : fonts.bold,
        fontSize: "16px",
        backgroundColor:
          action.variant === "destructive"
            ? token("destructive")
            : action.variant === "default"
              ? token("primary")
              : token("fill"),
        color:
          action.variant === "destructive"
            ? token("destructiveForeground")
            : action.variant === "default"
              ? token("primaryForeground")
              : token("foreground"),
      });
      button.addEventListener("click", () => close(action.value));
      row.append(button);
      return button;
    });

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close(dismissValue);
    });
    backdrop.addEventListener("keydown", (event) => {
      // Keys belong to the dialog while it's open, not to the page's hotkeys.
      event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        close(dismissValue);
      } else if (event.key === "Tab") {
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const step = event.shiftKey ? -1 : 1;
        event.preventDefault();
        buttons[(index + step + buttons.length) % buttons.length].focus();
      }
    });

    document.body.append(backdrop);
    buttons[0]?.focus();
  });
}
