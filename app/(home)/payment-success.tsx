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

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();

  useEffect(() => { console.log("Payment success screen mounted"); }, []);

  return <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.canvas, justifyContent: "center", padding: spacing.xl }}>
    <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
    <View style={{ alignItems: "center", padding: spacing.xl, backgroundColor: theme.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: "#E7F5EE", alignItems: "center", justifyContent: "center" }}><AppIcon name="checkmark" size={38} color="#147A48" /></View>
      <ThemedText variant="title1" align="center" style={{ marginTop: spacing.lg }}>Payment successful</ThemedText>
      <ThemedText variant="bodySm" tone="secondary" align="center" style={{ marginTop: spacing.sm }}>Your payment was received. You can view your shipment booking in My Shipments.</ThemedText>
      <PrimaryButton label="View my shipments" icon="arrow-forward" onPress={() => router.replace("/bookings")} style={{ marginTop: spacing.xl }} />
      <PrimaryButton label="Back to home" variant="ghost" onPress={() => router.replace("/")} style={{ marginTop: spacing.xs }} />
    </View>
  </SafeAreaView>;
}
