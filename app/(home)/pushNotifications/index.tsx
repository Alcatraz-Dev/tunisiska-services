import React from "react";
import { ScrollView, Switch, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";

import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import { useNotifications } from "@/app/context/NotificationContext";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";

export default function NotificationPreferencesScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const { notificationsEnabled, setNotificationsEnabled, permissionStatus } = useNotifications();
  return <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
    <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
    <ScreenHeader title="Notifications" subtitle="Manage your alerts" showBack />
    <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 40, gap: spacing.md }}>
      <View style={{ backgroundColor: theme.primary, borderRadius: radii.xl, padding: spacing.xl }}>
        <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}><AppIcon name="notifications-outline" size={23} color="#FFFFFF" /></View>
        <ThemedText variant="title2" style={{ color: "#FFFFFF", marginTop: spacing.md }}>Stay up to date</ThemedText>
        <ThemedText variant="bodySm" style={{ color: "#D9E2F1", marginTop: spacing.xs }}>Receive booking, shipment and departure updates on this device.</ThemedText>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: theme.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.border, padding: spacing.md }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center" }}><AppIcon name="phone-portrait-outline" size={19} color={theme.primary} /></View>
        <View style={{ flex: 1 }}><ThemedText variant="headline">Push notifications</ThemedText><ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>{permissionStatus?.granted ? "Device permission enabled" : "Allow updates from Tunisiska"}</ThemedText></View>
        <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: theme.borderStrong, true: theme.primary }} thumbColor={theme.surface} accessibilityLabel="Enable push notifications" />
      </View>
      <ThemedText variant="caption" tone="tertiary" style={{ paddingHorizontal: spacing.xs }}>You can also control notification permissions in your device settings.</ThemedText>
    </ScrollView>
  </SafeAreaView>;
}
