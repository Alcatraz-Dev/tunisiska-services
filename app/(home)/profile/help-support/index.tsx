import React, { useCallback, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import PressableScale from "@/app/components/ui/PressableScale";
import { useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { radii, spacing } from "@/app/theme/spacing";
import { showAlert } from "@/app/utils/showAlert";

const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
const SUPPORT_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE;
const SUPPORT_WHATSAPP = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP;

export default function HelpSupportScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [faqOpen, setFaqOpen] = useState(false);

  const openContact = useCallback(async (kind: "email" | "call" | "chat") => {
    const value = kind === "email" ? SUPPORT_EMAIL : kind === "call" ? SUPPORT_PHONE : SUPPORT_WHATSAPP;
    if (!value) {
      showAlert("Contact unavailable", `The ${kind === "email" ? "support email" : kind === "call" ? "support phone number" : "WhatsApp contact"} is not configured yet.`);
      return;
    }
    const url = kind === "email" ? `mailto:${value}` : kind === "call" ? `tel:${value}` : `https://wa.me/${value.replace(/\D/g, "")}`;
    try {
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      else showAlert("Unable to open", "No compatible app is available on this device.");
    } catch {
      showAlert("Unable to open", "Please try again later.");
    }
  }, []);

  const items: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; action: () => void }[] = [
    { icon: "chatbubble-ellipses-outline", title: "Chat with us", subtitle: "Message us on WhatsApp", action: () => openContact("chat") },
    { icon: "mail-outline", title: "Email support", subtitle: SUPPORT_EMAIL || "Contact details not configured", action: () => openContact("email") },
    { icon: "call-outline", title: "Call support", subtitle: SUPPORT_PHONE || "Contact details not configured", action: () => openContact("call") },
    { icon: "help-circle-outline", title: "Frequently asked questions", subtitle: "Common questions and answers", action: () => setFaqOpen((open) => !open) },
    { icon: "document-text-outline", title: "Terms & conditions", subtitle: "Read our terms", action: () => router.push("/(home)/profile/terms") },
    { icon: "shield-checkmark-outline", title: "Privacy policy", subtitle: "How your information is used", action: () => router.push("/(home)/profile/policy") },
  ];

  return <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
    <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
    <ScreenHeader title="Help & Support" subtitle="We’re here to help" showBack />
    <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 40 }}>
      <View style={{ backgroundColor: theme.primary, borderRadius: radii.xl, padding: spacing.xl, marginBottom: spacing.lg }}>
        <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}><AppIcon name="headset-outline" size={23} color="#FFFFFF" /></View>
        <ThemedText variant="title2" style={{ color: "#FFFFFF", marginTop: spacing.md }}>How can we help?</ThemedText>
        <ThemedText variant="bodySm" style={{ color: "#D9E2F1", marginTop: spacing.xs }}>Choose a contact option or browse the information below.</ThemedText>
      </View>
      <View style={{ backgroundColor: theme.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
        {items.map((item, index) => <PressableScale key={item.title} onPress={item.action} haptic="light" style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: index === items.length - 1 ? 0 : 1, borderColor: theme.borderSubtle }}>
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center" }}><AppIcon name={item.icon} size={19} color={theme.primary} /></View>
          <View style={{ flex: 1, gap: 2 }}><ThemedText variant="headline">{item.title}</ThemedText><ThemedText variant="caption" tone="secondary">{item.subtitle}</ThemedText></View>
          <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
        </PressableScale>)}
      </View>
      {faqOpen ? <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        <ThemedText variant="title3">Frequently asked questions</ThemedText>
        <View style={{ backgroundColor: theme.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.border, padding: spacing.md, gap: spacing.md }}>
          <View><ThemedText variant="headline">Where can I find my bookings?</ThemedText><ThemedText variant="bodySm" tone="secondary" style={{ marginTop: 4 }}>Open My Shipments from your profile to see your booking status and details.</ThemedText></View>
          <View><ThemedText variant="headline">How do I track a parcel?</ThemedText><ThemedText variant="bodySm" tone="secondary" style={{ marginTop: 4 }}>Open Track in Trips and enter the tracking number from your booking.</ThemedText></View>
        </View>
      </View> : null}
    </ScrollView>
  </SafeAreaView>;
}
