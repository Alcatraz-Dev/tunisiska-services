import React, { useEffect } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";

import ThemedText from "@/app/components/ui/ThemedText";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";

export default function PaymentCancelScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();

  useEffect(() => { console.log("Payment cancel screen mounted"); }, []);

  return <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.canvas, justifyContent: "center", padding: spacing.xl }}>
    <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
    <View style={{ alignItems: "center", padding: spacing.xl, backgroundColor: theme.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: "#FEF3E2", alignItems: "center", justifyContent: "center" }}><AppIcon name="close" size={38} color="#9A5B06" /></View>
      <ThemedText variant="title1" align="center" style={{ marginTop: spacing.lg }}>Payment cancelled</ThemedText>
      <ThemedText variant="bodySm" tone="secondary" align="center" style={{ marginTop: spacing.sm }}>No payment was taken. Return to your booking to review the details or try again.</ThemedText>
      <PrimaryButton label="Return to booking" icon="arrow-back" onPress={() => router.canGoBack() ? router.back() : router.replace("/services")} style={{ marginTop: spacing.xl }} />
      <PrimaryButton label="Go to home" variant="ghost" onPress={() => router.replace("/")} style={{ marginTop: spacing.xs }} />
    </View>
  </SafeAreaView>;
}
