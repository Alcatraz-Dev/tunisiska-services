import React from "react";
import { ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";

import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import PressableScale from "@/app/components/ui/PressableScale";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";
import { useLanguage } from "@/app/hooks/useLanguage";
import { supportedLanguages } from "@/app/hooks/useLanguage";

export default function LanguageSettings() {
  const { language, setLanguage } = useLanguage();
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();

  return <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
    <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
    <ScreenHeader title="Language" subtitle="Choose your app language" showBack />
    <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: 40, gap: spacing.sm }}>
      <ThemedText variant="overline" tone="tertiary" style={{ marginBottom: spacing.xs }}>AVAILABLE LANGUAGES</ThemedText>
      {supportedLanguages.map((item) => {
        const selected = language === item.code;
        return <PressableScale key={item.code} onPress={() => setLanguage(item.code)} haptic="selection" accessibilityRole="radio" accessibilityState={{ checked: selected }} style={{ minHeight: 72, borderRadius: radii.lg, borderWidth: 1, borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primarySoft : theme.surface, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}><ThemedText variant="headline" translate={false}>{item.nativeName}</ThemedText><ThemedText variant="caption" tone="secondary">{item.name}</ThemedText></View>
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: selected ? 0 : 1.5, borderColor: theme.borderStrong, backgroundColor: selected ? theme.accent : "transparent", alignItems: "center", justifyContent: "center" }}>{selected ? <AppIcon name="checkmark" size={13} color={theme.textOnAccent} /> : null}</View>
        </PressableScale>;
      })}
      <ThemedText variant="caption" tone="tertiary" style={{ marginTop: spacing.sm }}>Your selection is saved on this device.</ThemedText>
    </ScrollView>
  </SafeAreaView>;
}
