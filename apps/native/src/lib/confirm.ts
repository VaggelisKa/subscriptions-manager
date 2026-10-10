import { Alert } from "react-native";

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Label of the confirming button. Defaults to "OK". */
  confirmLabel?: string;
  /** Label of the cancelling button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Styles the confirming button as destructive (red). */
  destructive?: boolean;
};

/**
 * Asks the user to confirm an action. Resolves `true` when they confirm,
 * `false` when they cancel or dismiss. A native alert here; an accessible
 * dialog on the web (`confirm.web.ts`), where `Alert.alert` does nothing.
 */
export function confirm({
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      // Android can dismiss an alert without pressing a button.
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
