import type { ConfirmOptions } from "@/lib/confirm";

/**
 * The confirmation before deleting a subscription: the native alert's wording
 * on iOS and Android, the web app's on the web.
 */
export function deleteSubscriptionPrompt(name: string): ConfirmOptions {
  return process.env.EXPO_OS === "web"
    ? {
        title: `Delete “${name}”?`,
        message: "It's removed from your list and totals. This can't be undone.",
        confirmLabel: "Delete",
        destructive: true,
      }
    : {
        title: "Delete subscription",
        message: `Are you sure you want to delete "${name}"?`,
        confirmLabel: "Delete",
        destructive: true,
      };
}
