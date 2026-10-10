import { showDialog } from "./dialog.web";

/**
 * Tells the user something went wrong in an accessible alert dialog with an
 * OK button (RN Web's `Alert.alert` is a no-op). Resolves once it's dismissed.
 */
export function notify(title: string, message?: string): Promise<void> {
  return showDialog({
    title,
    message,
    actions: [{ label: "OK", value: undefined, variant: "default" }],
    dismissValue: undefined,
  });
}
