import * as Haptics from "expo-haptics";

const enabled = process.env.EXPO_OS === "ios";

export const haptics = {
  light: () => enabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => enabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  selection: () => enabled && Haptics.selectionAsync(),
  success: () =>
    enabled && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () =>
    enabled && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () =>
    enabled && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
