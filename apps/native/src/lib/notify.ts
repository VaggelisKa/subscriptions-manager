import { Alert } from "react-native";

/**
 * Tells the user something went wrong (or anything else that needs no
 * decision). Resolves once it's dismissed. A native alert here; an
 * accessible dialog on the web (`notify.web.ts`), where `Alert.alert` does
 * nothing.
 */
export function notify(title: string, message?: string): Promise<void> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [{ text: "OK", onPress: () => resolve() }], {
      cancelable: true,
      onDismiss: () => resolve(),
    });
  });
}
