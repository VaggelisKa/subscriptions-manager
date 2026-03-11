import { use, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { AuthContext } from "@/providers/auth-provider";
import { useTheme, useThemeColors } from "@/providers/theme-provider";
import { fonts, radius, spacing } from "@/lib/theme";

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { colorScheme, toggleTheme } = useTheme();
  const { signOut, deleteAccount } = use(AuthContext);
  const [deleting, setDeleting] = useState(false);

  function handleDeleteAccountPress() {
    if (process.env.EXPO_OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    Alert.alert(
      "Delete account",
      "This will permanently delete your account and all your subscriptions. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: confirmDeleteAccount,
        },
      ],
    );
  }

  async function confirmDeleteAccount() {
    setDeleting(true);

    const result = await deleteAccount();

    if (result.error) {
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Error", result.error);
    } else {
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    setDeleting(false);
  }

  const rowStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: "continuous" as const,
  };

  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: spacing.xl,
          gap: spacing.xl,
        }}
      >
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              fontFamily: fonts.semiBold,
              fontSize: 13,
              color: colors.mutedForeground,
              textTransform: "uppercase" as const,
              paddingHorizontal: spacing.sm,
            }}
          >
            Appearance
          </Text>
          <Pressable
            onPress={() => {
              if (process.env.EXPO_OS === "ios") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              toggleTheme();
            }}
            style={({ pressed }) => [
              rowStyle,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text
              style={{
                fontFamily: fonts.medium,
                fontSize: 16,
                color: colors.foreground,
              }}
            >
              Theme
            </Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 15,
                color: colors.mutedForeground,
              }}
            >
              {colorScheme === "dark" ? "Dark" : "Light"}
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              fontFamily: fonts.semiBold,
              fontSize: 13,
              color: colors.mutedForeground,
              textTransform: "uppercase" as const,
              paddingHorizontal: spacing.sm,
            }}
          >
            Account
          </Text>
          <View style={{ gap: spacing.sm }}>
            <Pressable
              onPress={signOut}
              style={({ pressed }) => [
                rowStyle,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text
                style={{
                  fontFamily: fonts.medium,
                  fontSize: 16,
                  color: colors.foreground,
                }}
              >
                Sign out
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDeleteAccountPress}
              disabled={deleting}
              style={({ pressed }) => [
                rowStyle,
                {
                  opacity: pressed || deleting ? 0.7 : 1,
                  borderWidth: 1,
                  borderColor: colors.destructive,
                  justifyContent: deleting ? "center" : "space-between",
                },
              ]}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={colors.destructive} />
              ) : (
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    fontSize: 16,
                    color: colors.destructive,
                  }}
                >
                  Delete account
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        <Text
          selectable
          style={{
            fontFamily: fonts.regular,
            fontSize: 13,
            color: colors.mutedForeground,
            textAlign: "center",
            paddingHorizontal: spacing.lg,
          }}
        >
          Deleting your account will permanently remove all your subscriptions
          and cannot be undone.
        </Text>
      </ScrollView>
    </>
  );
}
