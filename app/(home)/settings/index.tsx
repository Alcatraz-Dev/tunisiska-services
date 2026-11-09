import React from "react";
import { ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "@/app/components/ui/AppIcon";
import PressableScale from "@/app/components/ui/PressableScale";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";

export default function SettingsScreen() {
  const { resolvedTheme, theme: preference } = useTheme();
  const colors = useThemeColors();
  const router = useRouter();

  const groups = [
    {
      title: "Preferences",
      rows: [
        {
          icon: "contrast-outline" as const,
          title: "Appearance",
          value:
            preference === "system"
              ? "System"
              : preference === "dark"
                ? "Dark"
                : "Light",
          route: "/(home)/settings/appearance",
        },
        {
          icon: "language-outline" as const,
          title: "Language",
          value: "",
          route: "/(home)/profile/language",
        },
        {
          icon: "notifications-outline" as const,
          title: "Notifications",
          value: "",
          route: "/(home)/pushNotifications",
        },
      ],
    },
    {
      title: "Account",
      rows: [
        {
          icon: "person-outline" as const,
          title: "Personal information",
          value: "",
          route: "/(home)/profile/personal-information",
        },
        {
          icon: "headset-outline" as const,
          title: "Help & Support",
          value: "",
          route: "/(home)/profile/help-support",
        },
        {
          icon: "document-text-outline" as const,
          title: "Terms & conditions",
          value: "",
          route: "/(home)/profile/terms",
        },
        {
          icon: "shield-checkmark-outline" as const,
          title: "Privacy policy",
          value: "",
          route: "/(home)/profile/policy",
        },
      ],
    },
  ];

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.canvas }}
    >
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader title="Settings" subtitle="Preferences and account" showBack />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.gutter,
          paddingBottom: 40,
          gap: spacing.lg,
        }}
      >
        {groups.map((group) => (
          <View key={group.title}>
            <ThemedText
              variant="overline"
              tone="tertiary"
              style={{ marginBottom: spacing.sm }}
            >
              {group.title}
            </ThemedText>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: spacing.md,
              }}
            >
              {group.rows.map((row, index) => (
                <PressableScale
                  key={row.title}
                  onPress={() => router.push(row.route as any)}
                  haptic="light"
                  accessibilityRole="button"
                  style={{
                    minHeight: 58,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.md,
                    borderBottomWidth: index === group.rows.length - 1 ? 0 : 1,
                    borderColor: colors.borderSubtle,
                  }}
                >
                  <AppIcon name={row.icon} size={19} color={colors.primary} />
                  <ThemedText variant="bodySm" style={{ flex: 1 }}>
                    {row.title}
                  </ThemedText>
                  {row.value ? (
                    <ThemedText variant="caption" tone="secondary">
                      {row.value}
                    </ThemedText>
                  ) : null}
                  <AppIcon
                    name="chevron-forward"
                    size={16}
                    color={colors.textQuaternary}
                  />
                </PressableScale>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
