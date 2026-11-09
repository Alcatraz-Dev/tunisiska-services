import React from "react";
import { ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "@/app/components/ui/AppIcon";
import PressableScale from "@/app/components/ui/PressableScale";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";

const OPTIONS = [
  { value: "system" as const, title: "System", detail: "Follow your device settings", icon: "phone-portrait-outline" as const },
  { value: "light" as const, title: "Light", detail: "Use the light appearance", icon: "sunny-outline" as const },
  { value: "dark" as const, title: "Dark", detail: "Use the dark appearance", icon: "moon-outline" as const },
];

export default function AppearanceSettings() {
  const { theme: preference, resolvedTheme, setTheme } = useTheme();
  const colors = useThemeColors();

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader title="Appearance" subtitle="Choose how Tunisiska looks" showBack />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: 40, gap: spacing.sm }}>
        <ThemedText variant="bodySm" tone="secondary" style={{ marginBottom: spacing.sm }}>
          Your choice is saved on this device.
        </ThemedText>
        {OPTIONS.map((option) => {
          const selected = preference === option.value;
          return (
            <PressableScale
              key={option.value}
              onPress={() => setTheme(option.value)}
              haptic="selection"
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${option.title}. ${option.detail}`}
              style={{
                minHeight: 76,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primarySoft : colors.surface,
                paddingHorizontal: spacing.md,
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: selected ? colors.surface : colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                <AppIcon name={option.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <ThemedText variant="headline">{option.title}</ThemedText>
                <ThemedText variant="caption" tone="secondary">{option.detail}</ThemedText>
              </View>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: selected ? 0 : 1.5, borderColor: colors.borderStrong, backgroundColor: selected ? colors.accent : "transparent", alignItems: "center", justifyContent: "center" }}>
                {selected ? <AppIcon name="checkmark" size={13} color={colors.textOnAccent} /> : null}
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
