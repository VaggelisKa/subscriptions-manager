import type { ConfirmOptions } from "./confirm";
import { showDialog } from "./dialog.web";

export type { ConfirmOptions } from "./confirm";

/**
 * Asks the user to confirm an action in an accessible alert dialog (RN Web's
 * `Alert.alert` is a no-op). Cancel comes first and has focus, so Enter or Esc
 * never confirms by accident. Resolves `true` only when they confirm.
 */
export function confirm({
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  return showDialog({
    title,
    message,
    actions: [
      { label: cancelLabel, value: false, variant: "cancel" },
      {
        label: confirmLabel,
        value: true,
        variant: destructive ? "destructive" : "default",
      },
    ],
    dismissValue: false,
  });
}
